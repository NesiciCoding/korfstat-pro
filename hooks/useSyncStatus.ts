import { useState, useCallback, useRef } from 'react';
import { syncService, SyncState } from '../services/SyncService';
import { MatchState } from '../types';

interface SyncStatus {
  state: SyncState;
  lastError: string | null;
  lastSynced: Date | null;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    lastError: null,
    lastSynced: null,
  });

  // Register the callback once on mount
  const registered = useRef(false);
  if (!registered.current) {
    syncService.onStatus((state, error) => {
      setStatus(prev => ({
        state,
        lastError: state === 'error' || state === 'offline' ? (error ?? prev.lastError) : null,
        lastSynced: state === 'success' ? new Date() : prev.lastSynced,
      }));
    });
    registered.current = true;
  }

  const retry = useCallback((match: MatchState) => {
    syncService.syncMatch(match);
  }, []);

  return { ...status, retry };
}
