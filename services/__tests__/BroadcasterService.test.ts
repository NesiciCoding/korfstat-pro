import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OBSWebSocket from 'obs-websocket-js';
import { broadcasterService } from '../BroadcasterService';
import { BroadcasterSettings } from '../../types/broadcaster';

// Mock OBSWebSocket
const mockConnect = vi.fn().mockResolvedValue({});
const mockDisconnect = vi.fn().mockResolvedValue({});
const mockOn = vi.fn();
const mockCall = vi.fn().mockResolvedValue({});

vi.mock('obs-websocket-js', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any) {
      this.connect = mockConnect;
      this.disconnect = mockDisconnect;
      this.on = mockOn;
      this.call = mockCall;
    })
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('BroadcasterService', () => {
  const mockSettings: BroadcasterSettings = {
    enabled: true,
    type: 'OBS',
    ip: '127.0.0.1',
    port: 4455,
    password: 'test-password',
    autoClipGoals: true,
    autoClipCards: true,
    preRollSeconds: 5,
    postRollSeconds: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Reset the service between tests if needed
    // broadcasterService.reset(); // If such a method existed
  });

  describe('updateSettings', () => {
    it('should initialize OBS connection when enabled and type is OBS', async () => {
      await broadcasterService.updateSettings(mockSettings);
      expect(OBSWebSocket).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalledWith('ws://127.0.0.1:4455', 'test-password');
    });

    it('should disconnect existing OBS when disabled', async () => {
      // First connect
      await broadcasterService.updateSettings(mockSettings);
      
      // Then disable
      await broadcasterService.updateSettings({ ...mockSettings, enabled: false });
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should switch to vMix by disconnecting OBS', async () => {
      await broadcasterService.updateSettings(mockSettings);

      await broadcasterService.updateSettings({ ...mockSettings, type: 'VMIX' });
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('triggerHighlight', () => {
    it('should call SaveReplayBuffer for OBS', async () => {
      await broadcasterService.updateSettings(mockSettings);

      await broadcasterService.triggerHighlight('Goal Scored');
      expect(mockCall).toHaveBeenCalledWith('SaveReplayBuffer');
    });

    it('should call fetch with correct URL for vMix', async () => {
      const vmixSettings: BroadcasterSettings = { ...mockSettings, type: 'VMIX' };
      await broadcasterService.updateSettings(vmixSettings);
      
      await broadcasterService.triggerHighlight('Goal Scored');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://127.0.0.1:4455/api/?Function=ReplayMarkInOut&Value=5'),
        expect.any(Object)
      );
    });

    it('should ignore triggers when disabled', async () => {
      await broadcasterService.updateSettings({ ...mockSettings, enabled: false });
      vi.clearAllMocks();

      await broadcasterService.triggerHighlight('Goal Scored');
      expect(global.fetch).not.toHaveBeenCalled();
      // Since it's a mock, we check if ANY new OBS instance was created or called
      expect(vi.mocked(OBSWebSocket)).not.toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return success for valid OBS connection', async () => {
      const result = await broadcasterService.testConnection(mockSettings);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully connected to OBS');
    });

    it('should return failure for invalid OBS connection', async () => {
      vi.mocked(OBSWebSocket).mockImplementationOnce(function (this: any) {
        this.connect = vi.fn().mockRejectedValue(new Error('Connection Refused'));
        this.disconnect = vi.fn();
        this.on = vi.fn();
        this.call = vi.fn();
      } as any);

      const result = await broadcasterService.testConnection(mockSettings);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection Refused');
    });

    it('should return success for vMix API reachability', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as any);
      const result = await broadcasterService.testConnection({ ...mockSettings, type: 'VMIX' });
      expect(result.success).toBe(true);
    });
  });
});
