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
  half: 1 | 2;
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
}

export interface MatchState {
  id?: string;   // Unique ID for persistence
  date?: number; // Timestamp for persistence
  isConfigured: boolean;
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  currentHalf: 1 | 2;
  possession: TeamId | null;
  timer: {
    elapsedSeconds: number;
    isRunning: boolean;
  };
  shotClock: {
    seconds: number;
    isRunning: boolean;
  };
  timeout: {
    isActive: boolean;
    startTime: number;
    remainingSeconds: number;
    teamId?: TeamId; // Team that called the timeout
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