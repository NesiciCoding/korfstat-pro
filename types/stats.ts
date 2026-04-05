import { MatchState, MatchEvent, Player, ShotType } from './index';

export type MilestoneTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface Milestone {
    id: string;
    type: 'GOALS' | 'ACCURACY' | 'CLUTCH' | 'IRON_WALL';
    tier: MilestoneTier;
    value: number;
    threshold: number;
    achievedAt: number; // Timestamp
}

export interface PlayerStats {
    matchesPlayed: number;
    goals: number;
    shots: number;
    shootingPercentage: number;
    penalties: {
        scored: number;
        missed: number;
        total: number;
    };
    freeKicks: {
        scored: number;
        missed: number;
        total: number;
    };
    wins: number;
    losses: number;
    draws: number;
    milestones: Milestone[];
}

export interface TrendPoint {
    date: number;
    goals: number;
    opponent: string;
    result: 'W' | 'L' | 'D';
    accuracy: number;
}
