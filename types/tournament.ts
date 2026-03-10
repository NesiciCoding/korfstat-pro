import { TeamId, MatchState } from './index';

export interface BracketConfig {
    teamCount: number; // 4, 8, 16, 32, etc. (Determines number of starting nodes)
    thirdPlaceMatch: boolean; // Whether to include a 3rd place playoff
}

export interface GroupConfig {
    groupCount: number; // Number of distinct pools/groups
    teamsPerGroup: number;
    advancingPerGroup: number; // e.g., Top 2 from each group go to Knockouts
}

export interface BracketParticipant {
    type: 'TEAM' | 'TBD' | 'WINNER_OF' | 'LOSER_OF' | 'GROUP_POSITION';
    teamId?: string; // Resolved Team ID
    sourceNodeId?: string; // ID of the match they must win/lose to get here
    groupId?: string; // The group they advance from
    groupPosition?: number; // Their finishing rank in the group (e.g. 1st, 2nd)
    nameOverride?: string; // Display text for TBDs, e.g. "Winner QF1"
}

export interface BracketNode {
    id: string; // e.g., 'QF_1', 'SF_1', 'FINAL', 'THIRD_PLACE'
    round: number; // 0 for final, 1 for semi, 2 for quarter, etc.
    position: number; // Top to bottom ordering within a round
    home: BracketParticipant;
    away: BracketParticipant;
    matchId?: string; // Link to actual KorfStat MatchState
    nextMatchId?: string; // Where the winner goes (optional, inferred usually)
    nextLoserMatchId?: string; // Where the loser goes (for specific placement matches)
}

export interface Group {
    id: string; // e.g., 'GROUP_A', 'GROUP_B'
    name: string; // "Group A"
    teamIds: string[]; // Teams assigned to this group
}
