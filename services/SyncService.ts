import { supabase } from '../lib/supabase';
import { MatchState, MatchEvent } from '../types';

export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export type SyncStatusCallback = (state: SyncState, error?: string) => void;

interface PendingEvent {
  matchId: string;
  seq: number;
  event: MatchEvent;
}

export class SyncService {
  private userId: string | null = null;
  private clubId: string | null = null;
  private onStatusChange?: SyncStatusCallback;

  /** Events queued while offline or between flushes */
  private pendingEvents: PendingEvent[] = [];
  /** IDs of events already confirmed written to Supabase */
  private sentEventIds = new Set<string>();
  /** Debounce timer for full blob sync */
  private blobSyncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(userId: string | null, clubId: string | null = null) {
    this.userId = userId;
    this.clubId = clubId;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flushEventQueue());
    }
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  setClubId(clubId: string | null) {
    this.clubId = clubId;
  }

  onStatus(cb: SyncStatusCallback) {
    this.onStatusChange = cb;
  }

  private emit(state: SyncState, error?: string) {
    this.onStatusChange?.(state, error);
  }

  private get isReady() {
    return this.userId && this.userId !== 'guest';
  }

  // ---------------------------------------------------------------------------
  // Event-sourced queue — safe for concurrent trackers
  // ---------------------------------------------------------------------------

  /**
   * Queue a single discrete match event for upload. Events are idempotent
   * (upserted by event.id) so calling this more than once for the same event
   * is safe. Flushes immediately when online.
   */
  queueEvent(matchId: string, event: MatchEvent, seq: number) {
    if (this.sentEventIds.has(event.id)) return;
    // Avoid duplicate entries in the queue
    if (!this.pendingEvents.find(p => p.event.id === event.id)) {
      this.pendingEvents.push({ matchId, seq, event });
    }
    if (navigator.onLine) {
      this.flushEventQueue();
    }
  }

  /**
   * Write all pending events to Supabase. On failure, events are retained in
   * the queue and will be retried on the next call (or `online` event).
   */
  async flushEventQueue() {
    if (!this.isReady || this.pendingEvents.length === 0) return;
    if (!navigator.onLine) return;

    const toSend = [...this.pendingEvents];
    this.pendingEvents = [];

    try {
      const rows = toSend.map(({ matchId, seq, event }) => ({
        id: event.id,
        match_id: matchId,
        club_id: this.clubId,
        user_id: this.userId,
        seq,
        event_json: event,
      }));

      const { error } = await supabase
        .from('match_events')
        .upsert(rows, { onConflict: 'id' });

      if (error) throw error;

      toSend.forEach(({ event }) => this.sentEventIds.add(event.id));
    } catch (err: any) {
      // Put unsent events back at the front of the queue
      this.pendingEvents = [...toSend, ...this.pendingEvents];
      console.error('[Sync] Failed to flush event queue:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Full blob sync — kept for backwards compatibility and periodic consistency
  // ---------------------------------------------------------------------------

  /**
   * Sync a match state to Supabase (last-write-wins blob).
   * Prefer queueEvent() for individual events; call this on structural changes
   * (phase transitions, match end) or via syncMatchDebounced() for periodic sync.
   */
  async syncMatch(match: MatchState) {
    if (!this.isReady) return;

    if (!navigator.onLine) {
      this.emit('offline');
      return;
    }

    this.emit('syncing');
    try {
      const homeScore = match.events.filter(
        e => e.teamId === 'HOME' && e.type === 'SHOT' && e.result === 'GOAL'
      ).length;
      const awayScore = match.events.filter(
        e => e.teamId === 'AWAY' && e.type === 'SHOT' && e.result === 'GOAL'
      ).length;

      const { error } = await supabase
        .from('matches')
        .upsert({
          id: match.id,
          user_id: this.userId,
          club_id: this.clubId,
          home_team_name: match.homeTeam.name,
          away_team_name: match.awayTeam.name,
          home_score: homeScore,
          away_score: awayScore,
          match_date: match.date ?? null,
          status: match.isConfigured ? 'ACTIVE' : 'SETUP',
          data_json: match,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      this.emit('success');
    } catch (err: any) {
      const msg = err?.message ?? 'Unknown sync error';
      console.error('[Sync] Error syncing match:', err);
      this.emit(navigator.onLine ? 'error' : 'offline', msg);
    }
  }

  /**
   * Debounced wrapper around syncMatch. Collapses rapid state changes into a
   * single upload after `delay` ms of inactivity (default 5 s).
   */
  syncMatchDebounced(match: MatchState, delay = 5000) {
    if (this.blobSyncTimer) clearTimeout(this.blobSyncTimer);
    this.blobSyncTimer = setTimeout(() => this.syncMatch(match), delay);
  }

  // ---------------------------------------------------------------------------
  // Load helpers — two-phase: lightweight list first, full detail on demand
  // ---------------------------------------------------------------------------

  /**
   * Load a lightweight summary list (no events, no player rosters).
   * Uses score columns populated by syncMatch so the list renders correctly
   * without the full data_json blob.
   *
   * Requires the matches table to have home_score, away_score, match_date
   * columns (added in the bulletproofing SQL migration).
   */
  async loadMatchSummaries(): Promise<MatchState[]> {
    if (!this.isReady) return [];

    if (!navigator.onLine) {
      this.emit('offline');
      return [];
    }

    try {
      let query = supabase
        .from('matches')
        .select('id, home_team_name, away_team_name, home_score, away_score, status, updated_at, match_date')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (this.clubId) {
        query = query.eq('club_id', this.clubId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(row => {
        // Inject minimal fake goal events so score display works without
        // loading the full data_json blob.
        const fakeEvents: MatchEvent[] = [];
        for (let i = 0; i < (row.home_score ?? 0); i++) {
          fakeEvents.push({
            id: `_sh${i}_${row.id}`, timestamp: 0, realTime: 0,
            half: 1, teamId: 'HOME', type: 'SHOT', result: 'GOAL',
          });
        }
        for (let i = 0; i < (row.away_score ?? 0); i++) {
          fakeEvents.push({
            id: `_sa${i}_${row.id}`, timestamp: 0, realTime: 0,
            half: 1, teamId: 'AWAY', type: 'SHOT', result: 'GOAL',
          });
        }

        return {
          id: row.id,
          date: row.match_date ?? new Date(row.updated_at).getTime(),
          isConfigured: row.status !== 'SETUP',
          homeTeam: { id: 'HOME', name: row.home_team_name, players: [], color: '', substitutionCount: 0 },
          awayTeam: { id: 'AWAY', name: row.away_team_name, players: [], color: '', substitutionCount: 0 },
          events: fakeEvents,
          currentHalf: 1,
          possession: null,
          timer: { elapsedSeconds: 0, isRunning: false },
          shotClock: { seconds: 25, isRunning: false },
          timeout: { isActive: false, startTime: 0, remainingSeconds: 0 },
        } as MatchState;
      });
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load match summaries';
      console.error('[Sync] Error loading match summaries:', err);
      this.emit(navigator.onLine ? 'error' : 'offline', msg);
      return [];
    }
  }

  /**
   * Load the full MatchState for a single match (data_json blob).
   * Call this when the user selects a cloud-only summary match for detailed
   * viewing (StatsView, MatchAnalysis, etc.).
   */
  async loadMatchDetail(matchId: string): Promise<MatchState | null> {
    if (!this.isReady || !navigator.onLine) return null;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('data_json')
        .eq('id', matchId)
        .single();

      if (error) throw error;
      return (data?.data_json as MatchState) ?? null;
    } catch (err: any) {
      console.error('[Sync] Error loading match detail:', err);
      return null;
    }
  }

  /**
   * Load all matches for the current club (or user) from the cloud.
   * @deprecated Prefer loadMatchSummaries() + loadMatchDetail() for better
   * performance. Kept for backwards compatibility.
   */
  async loadMatches(): Promise<MatchState[]> {
    if (!this.isReady) return [];

    if (!navigator.onLine) {
      this.emit('offline');
      return [];
    }

    try {
      let query = supabase
        .from('matches')
        .select('data_json')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (this.clubId) {
        query = query.eq('club_id', this.clubId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(row => row.data_json as MatchState);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load matches';
      console.error('[Sync] Error loading matches:', err);
      this.emit(navigator.onLine ? 'error' : 'offline', msg);
      return [];
    }
  }

  /**
   * Delete a match from the cloud (cascades to match_events via FK).
   */
  async deleteMatch(matchId: string) {
    if (!this.isReady) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
    } catch (err: any) {
      console.error('[Sync] Error deleting match:', err);
    }
  }
}

export const syncService = new SyncService(null, null);
