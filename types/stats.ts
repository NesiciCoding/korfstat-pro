import { ShotType } from './index';

export type MilestoneTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export type PlayerArchetype =
    | 'SCORING_MACHINE'
    | 'IRON_WALL'
    | 'CLUTCH_PERFORMER'
    | 'PLAYMAKER'
    | 'RISING_STAR'
    | 'VERSATILE';

export interface Milestone {
    id: string;
    type: 'GOALS' | 'ACCURACY' | 'CLUTCH' | 'IRON_WALL' | 'REBOUNDS' | 'CONSISTENCY' | 'SHARPSHOOTER';
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

    // Extended career stats
    rebounds: number;
    turnovers: number;
    yellowCards: number;
    redCards: number;
    careerRating: number;       // VAL formula per match
    goalsPerMatch: number;
    goalsFirstHalf: number;
    goalsSecondHalf: number;
    shotsByType: Record<ShotType, { shots: number; goals: number }>;
    bestMatch: { goals: number; accuracy: number; opponent: string; date: number } | null;
    currentGoalStreak: number;
    longestGoalStreak: number;
    careerPlusMinus: number;
    archetype: PlayerArchetype;
}

export interface TrendPoint {
    date: number;
    goals: number;
    opponent: string;
    result: 'W' | 'L' | 'D';
    accuracy: number;
    shots: number;
    rebounds: number;
    plusMinus: number;
    rating: number;
}
