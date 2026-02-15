import { Team } from '../types';

export interface Season {
    id: string;
    name: string;
    startDate: number;
    endDate?: number;
    teams: Team[];
    matches: string[]; // Match IDs
    standings: Standing[];
}

export interface Standing {
    teamId: string; // 'HOME' | 'AWAY' are just for a single match, this should be the persistent Team ID or Name
    teamName: string;
    played: number;
    won: number;
    lost: number;
    draw: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
}
