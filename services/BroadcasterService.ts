import OBSWebSocket from 'obs-websocket-js';
import { BroadcasterSettings } from '../types/broadcaster';

export class BroadcasterService {
  private obs: OBSWebSocket | null = null;
  private settings: BroadcasterSettings | null = null;
  private isConnecting = false;

  /**
   * Initializes or re-initializes the broadcaster connection based on provided settings.
   */
  async updateSettings(settings: BroadcasterSettings) {
    this.settings = settings;

    // Clean up existing OBS connection if switching types or disabling
    if (this.obs && (settings.type !== 'OBS' || !settings.enabled)) {
      try {
        await this.obs.disconnect();
      } catch (e) {
        console.error('[Broadcaster] Error disconnecting OBS:', e);
      }
      this.obs = null;
    }

    if (settings.enabled && settings.type === 'OBS' && !this.obs && !this.isConnecting) {
      await this.connectOBS();
    }
  }

  private async connectOBS() {
    if (!this.settings || this.settings.type !== 'OBS' || this.isConnecting) return;

    this.isConnecting = true;
    const { ip, port, password } = this.settings;
    const url = `ws://${ip}:${port}`;

    try {
      this.obs = new OBSWebSocket();
      await this.obs.connect(url, password);
      console.log(`[Broadcaster] Connected to OBS at ${url}`);
      
      this.obs.on('ConnectionClosed', () => {
        console.warn('[Broadcaster] OBS Connection Closed');
        this.obs = null;
        this.isConnecting = false;
      });
    } catch (err) {
      console.error(`[Broadcaster] Failed to connect to OBS at ${url}:`, err);
      this.obs = null;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Triggers a highlight/replay save in the configured broadcaster.
   */
  async triggerHighlight(description: string = 'KorfStat Highlight') {
    if (!this.settings || !this.settings.enabled) return;

    console.log(`[Broadcaster] Triggering highlight: ${description}`);

    if (this.settings.type === 'OBS') {
      await this.triggerOBSHighlight();
    } else if (this.settings.type === 'VMIX') {
      await this.triggerVMixHighlight();
    }
  }

  private async triggerOBSHighlight() {
    if (!this.obs) {
      console.warn('[Broadcaster] OBS not connected, attempting to reconnect...');
      await this.connectOBS();
    }

    if (this.obs) {
      try {
        // OBS uses the Replay Buffer. It must be active.
        await this.obs.call('SaveReplayBuffer');
        console.log('[Broadcaster] OBS Replay Buffer saved.');
      } catch (err) {
        console.error('[Broadcaster] OBS SaveReplayBuffer failed:', err);
      }
    }
  }

  private async triggerVMixHighlight() {
    if (!this.settings) return;

    const { ip, port, preRollSeconds } = this.settings;
    // vMix HTTP API: /api/?Function=ReplayMarkInOut&Value=5 (saves last 5 seconds)
    // Actually, Value in vMix for ReplayMarkInOut is the seconds.
    const url = `http://${ip}:${port}/api/?Function=ReplayMarkInOut&Value=${preRollSeconds}`;

    try {
      const response = await fetch(url, { mode: 'no-cors' });
      // mode: 'no-cors' is often needed if vMix is on a different origin and doesn't send CORS headers,
      // though 'no-cors' limits our ability to read the response.
      console.log(`[Broadcaster] vMix highlight triggered via ${url}`);
    } catch (err) {
      console.error('[Broadcaster] vMix trigger failed:', err);
    }
  }

  /**
   * Tests the connection with current settings and returns success/error.
   */
  async testConnection(settings: BroadcasterSettings): Promise<{ success: boolean; message: string }> {
    if (settings.type === 'OBS') {
      const testObs = new OBSWebSocket();
      const url = `ws://${settings.ip}:${settings.port}`;
      try {
        await testObs.connect(url, settings.password);
        await testObs.disconnect();
        return { success: true, message: 'Successfully connected to OBS!' };
      } catch (err: any) {
        return { success: false, message: `OBS Connection Failed: ${err.message || 'Unknown error'}` };
      }
    } else if (settings.type === 'VMIX') {
      const url = `http://${settings.ip}:${settings.port}/api/`;
      try {
        // Try a simple Get Replay state or similar, or just a ping
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);
        
        await fetch(url, { signal: controller.signal, mode: 'no-cors' });
        clearTimeout(id);
        return { success: true, message: 'Successfully reached vMix API!' };
      } catch (err: any) {
        return { success: false, message: `vMix Connection Failed: ${err.message || 'Connection timeout or invalid IP'}` };
      }
    }
    return { success: false, message: 'No broadcaster type selected.' };
  }
}

export const broadcasterService = new BroadcasterService();
