import { Team } from './index';

import { BracketConfig, GroupConfig, Group } from './tournament';

export interface Season {
    id: string;
    name: string;
    format?: 'LEAGUE' | 'KNOCKOUT' | 'GROUP_KNOCKOUT';
    startDate: number;
    endDate?: number;
    teams: Team[];
    matches: string[]; // Match IDs
    standings: Standing[]; // For League or Group Stages
    bracketMap?: Record<string, string>; // Maps node ID (e.g. 'SF1') to matchId
    bracketConfig?: BracketConfig;
    groupConfig?: GroupConfig;
    groups?: Group[];
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
