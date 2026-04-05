import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';

// Explicitly mock lib/supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
}));

const { SyncService } = await vi.importActual<typeof import('../SyncService')>('../SyncService');

describe('SyncService', () => {
  let service: any; // Use any to avoid complex typing issues with the mock
  const mockUserId = 'test-user-123';
  const mockMatch = {
    id: 'match-1',
    isConfigured: true,
    homeTeam: { name: 'Home' },
    awayTeam: { name: 'Away' },
    events: []
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SyncService(mockUserId);
  });

  describe('syncMatch', () => {
    it('should return early if userId is guest or null', async () => {
      service.setUserId('guest');
      await service.syncMatch(mockMatch);
      expect(supabase.from).not.toHaveBeenCalled();

      service.setUserId(null);
      await service.syncMatch(mockMatch);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should upsert match data to supabase', async () => {
      (vi.mocked(supabase).upsert as any).mockResolvedValue({ data: [mockMatch], error: null } as any);
      
      await service.syncMatch(mockMatch);
      
      expect(supabase.from).toHaveBeenCalledWith('matches');
      expect(supabase.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: mockMatch.id,
        user_id: mockUserId,
        home_team_name: mockMatch.homeTeam.name,
      }));
    });

    it('should log error if upsert fails', async () => {
      const consoleSpacer = vi.spyOn(console, 'error').mockImplementation(() => {});
      (vi.mocked(supabase).upsert as any).mockResolvedValue({ data: null, error: new Error('Upsert failed') } as any);
      
      await service.syncMatch(mockMatch);
      
      expect(consoleSpacer).toHaveBeenCalledWith('[Sync] Error syncing match:', expect.any(Error));
    });
  });

  describe('loadMatches', () => {
    it('should return empty array if userId is guest or null', async () => {
      service.setUserId('guest');
      const results = await service.loadMatches();
      expect(results).toEqual([]);

      service.setUserId(null);
      const results2 = await service.loadMatches();
      expect(results2).toEqual([]);
    });

    it('should load matches from supabase', async () => {
      const mockRows = [{ data_json: { id: '1' } }, { data_json: { id: '2' } }];
      (vi.mocked(supabase).order as any).mockResolvedValue({ data: mockRows, error: null } as any);
      
      const results = await service.loadMatches();
      
      expect(supabase.from).toHaveBeenCalledWith('matches');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('1');
    });

    it('should handle errors during load', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (vi.mocked(supabase).order as any).mockResolvedValue({ data: null, error: new Error('Load failed') } as any);
      
      const results = await service.loadMatches();
      expect(results).toEqual([]);
    });
  });

  describe('deleteMatch', () => {
    it('should return early if userId is guest or null', async () => {
      service.setUserId('guest');
      await service.deleteMatch('1');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should delete match from supabase', async () => {
      (vi.mocked(supabase).eq as any).mockResolvedValue({ error: null } as any);
      
      await service.deleteMatch('match-1');
      
      expect(supabase.from).toHaveBeenCalledWith('matches');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', 'match-1');
    });

    it('should handle errors during delete', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      (vi.mocked(supabase).eq as any).mockResolvedValue({ error: new Error('Delete failed') } as any);
      
      await service.deleteMatch('match-1');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
