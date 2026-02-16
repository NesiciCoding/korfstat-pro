export type TeamId = 'HOME' | 'AWAY';
export type Gender = 'M' | 'F';
export type Position = 'ATTACK' | 'DEFENSE';

export interface Player {
  id: string;
  number: number;
  name: string;
  gender: Gender;
  initialPosition: Position;
  isStarter: boolean;
  onField?: boolean;
  isSuspended?: boolean; // For Yellow card time penalty
  suspensionEndTime?: number; // Timestamp when they can return
  careerStats?: {
    matches: number;
    goals: number;
    chances: number;
  };
}

export interface Team {
  id: TeamId;
  name: string;
  players: Player[];
  color: string; // Hex code
  substitutionCount: number;
}

export type ShotType = 'FREE_THROW' | 'PENALTY' | 'NEAR' | 'MEDIUM' | 'FAR' | 'RUNNING_IN';
export type ActionType = 'SHOT' | 'REBOUND' | 'FOUL' | 'TURNOVER' | 'SHOT_CLOCK' | 'SUBSTITUTION' | 'CARD' | 'TIMEOUT';
export type ShotResult = 'GOAL' | 'MISS';
export type CardType = 'YELLOW' | 'RED';

export interface MatchEvent {
  id: string;
  timestamp: number;
  realTime: number;
  half: number;
  teamId: TeamId;
  playerId?: string;
  type: ActionType;

  // Shot specific
  location?: { x: number; y: number };
  shotType?: ShotType;
  result?: ShotResult;

  // Rebound specific
  reboundType?: 'OFFENSIVE' | 'DEFENSIVE';

  // Substitution specific
  subInId?: string;
  subOutId?: string;
  subReason?: 'REGULAR' | 'INJURY' | 'RED_CARD';

  // Card specific
  cardType?: CardType;

  // Undo tracking
  previousPossession?: TeamId | null;
}

export interface MatchState {
  id?: string;   // Unique ID for persistence
  seasonId?: string; // Link to a season
  date?: number; // Timestamp for persistence
  halfDurationSeconds: number; // Duration of a half in seconds (e.g. 1500 for 25m)
  isConfigured: boolean;
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  currentHalf: number;
  possession: TeamId | null;
  timer: {
    elapsedSeconds: number;
    isRunning: boolean;
    lastStartTime?: number; // Timestamp when it started running
  };
  shotClock: {
    seconds: number;
    isRunning: boolean;
    lastStartTime?: number; // Timestamp when it started running
  };
  timeout: {
    isActive: boolean;
    startTime: number;
    remainingSeconds: number;
    teamId?: TeamId; // Team that called the timeout
    lastStartTime?: number; // Timestamp if we need to pause/resume timeout (rare but consistent)
  };
  break?: {
    isActive: boolean;
    startTime: number;
    durationSeconds: number;
  };
  overlayOverride?: OverlayMessage | null;

  // Video Sync
  videoUrl?: string;
  videoOffset?: number; // Time in seconds in the video where the match timer = 0
  videoSourceType?: 'local' | 'url';

  // Broadcast Theme
  broadcastTheme?: {
    theme: 'modern' | 'classic' | 'neon' | 'minimal';
    font: 'roboto' | 'inter' | 'montserrat' | 'oswald';
    accentColor?: string;
    showShotClock?: boolean;
    scoreboardPosition?: 'bottom' | 'top';
  };
}

export const SHOT_TYPES: { value: ShotType; label: string; isStatic: boolean }[] = [
  { value: 'PENALTY', label: 'Penalty', isStatic: true },
  { value: 'FREE_THROW', label: 'Free Pass', isStatic: true },
  { value: 'RUNNING_IN', label: 'Running In', isStatic: false },
  { value: 'NEAR', label: 'Short', isStatic: false },
  { value: 'MEDIUM', label: 'Medium', isStatic: false },
  { value: 'FAR', label: 'Long', isStatic: false },
];

export interface SavedTeam {
  id: string; // Unique ID
  name: string;
  color: string;
  players: Player[]; // Complete roster including default numbers/positions
}

export interface OverlayMessage {
  id: string;
  text: string;
  subText?: string;
  type: 'SCROLL' | 'POPUP' | 'FULLSCREEN';
  color?: string;
  visible: boolean;
}