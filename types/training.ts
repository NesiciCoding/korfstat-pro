export type MetricType = 'COUNT' | 'PERCENTAGE' | 'SECONDS' | 'SUCCESS_FAILURE';

export interface Drill {
  id: string;
  name: string;
  description?: string;
  metricType: MetricType;
  target?: number; // Optional target to hit
  category?: 'SHOOTING' | 'FITNESS' | 'TECHNICAL' | 'TACTICAL';
}

export interface PlayerDrillResult {
  playerId: string;
  drillId: string;
  value: number; // The actual result (e.g., 45 goals, 80%, 120 seconds)
  attempts?: number; // Optional: total attempts if type is percentage/count
  timestamp: number;
}

export interface TrainingSession {
  id: string;
  date: number; // Timestamp
  teamId: string; // The team practicing
  location?: string;
  attendees: string[]; // List of player IDs present
  drillResults: PlayerDrillResult[];
  notes?: string;
  isSynced?: boolean;
}

export interface TrainingState {
  sessions: TrainingSession[];
  activeSessionId?: string;
}
