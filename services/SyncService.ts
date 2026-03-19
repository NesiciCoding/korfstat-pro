import { supabase } from '../lib/supabase';
import { MatchState, MatchEvent } from '../types';

export class SyncService {
  private userId: string | null = null;

  constructor(userId: string | null) {
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Sync a match state to Supabase.
   * This is a "last-write-wins" approach for the match metadata,
   * but we can also sync events incrementally.
   */
  async syncMatch(match: MatchState) {
    if (!this.userId || this.userId === 'guest') return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .upsert({
          id: match.id,
          user_id: this.userId,
          home_team_name: match.homeTeam.name,
          away_team_name: match.awayTeam.name,
          status: match.isConfigured ? 'ACTIVE' : 'SETUP',
          data_json: match,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      console.log(`[Sync] Match ${match.id} synced to cloud.`);
    } catch (err) {
      console.error('[Sync] Error syncing match:', err);
    }
  }

  /**
   * Load all matches for the current user from the cloud.
   */
  async loadMatches(): Promise<MatchState[]> {
    if (!this.userId || this.userId === 'guest') return [];

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('data_json')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => row.data_json as MatchState);
    } catch (err) {
      console.error('[Sync] Error loading matches:', err);
      return [];
    }
  }

  /**
   * Delete a match from the cloud.
   */
  async deleteMatch(matchId: string) {
    if (!this.userId || this.userId === 'guest') return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
    } catch (err) {
      console.error('[Sync] Error deleting match:', err);
    }
  }
}

export const syncService = new SyncService(null);
