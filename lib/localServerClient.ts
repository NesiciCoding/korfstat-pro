import { ApiClient, ApiResult } from './ApiClient';

/** Resolve the local Express server base URL regardless of environment */
function getServerBase(): string {
  const { protocol, hostname, origin } = window.location;
  if (protocol === 'tauri:' || hostname === 'tauri.localhost' || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }
  return origin.replace(':5173', ':3002').replace(':3000', ':3002');
}

export interface SetupInfo {
  localIp: string;
}

export interface ActiveMatch {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  status: string;
}

export const localServerClient = {
  /**
   * Fetch the server's local IP (used by jury/spotter views for QR codes).
   * Best-effort — callers should handle null gracefully.
   */
  async getSetupInfo(): Promise<ApiResult<SetupInfo>> {
    return ApiClient.fetch<SetupInfo>(
      `${getServerBase()}/api/companion/setup-info`,
      {},
      { attempts: 2, baseDelayMs: 300 }
    );
  },

  /**
   * Remove a match from the active server session list after finishing.
   */
  async deleteActiveMatch(matchId: string): Promise<ApiResult<void>> {
    return ApiClient.fetch<void>(
      `${getServerBase()}/api/matches/active/${matchId}`,
      { method: 'DELETE' },
      { attempts: 1 }
    );
  },

  /**
   * Sync Wear OS / Ref Watch state (fire-and-forget — best effort).
   */
  async syncWatch(payload: Record<string, unknown>): Promise<void> {
    const base = getServerBase();
    ApiClient.fetch(
      `${base}/api/sync-watch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { attempts: 1 }
    ).then(({ error }) => {
      if (error) console.debug('[Watch] Sync skipped:', error.message);
    });
  },

  /**
   * Upload a file (team logo, player photo).
   */
  async uploadFile(file: File): Promise<ApiResult<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return ApiClient.fetch<{ url: string }>(
      `${getServerBase()}/api/upload`,
      { method: 'POST', body: formData },
      { attempts: 2 }
    );
  },
};
