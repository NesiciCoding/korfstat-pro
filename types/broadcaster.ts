export type BroadcasterType = 'OBS' | 'VMIX' | 'NONE';

export interface BroadcasterSettings {
  type: BroadcasterType;
  enabled: boolean;
  ip: string;
  port: number;
  password?: string;
  preRollSeconds: number;
  postRollSeconds: number;
  autoClipGoals: boolean;
  autoClipCards: boolean;
}

export const DEFAULT_BROADCASTER_SETTINGS: BroadcasterSettings = {
  type: 'NONE',
  enabled: false,
  ip: 'localhost',
  port: 4455, // Default OBS port
  preRollSeconds: 5,
  postRollSeconds: 2,
  autoClipGoals: true,
  autoClipCards: true
};
