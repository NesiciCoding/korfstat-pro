export interface MatchProfile {
    id: string;
    name: string;
    description: string;
    periods: number; // e.g., 2 halves, 4 quarters
    periodDurationSeconds: number; // e.g., 1500 for 25m
    hasShotClock: boolean;
    shotClockDurationSeconds: number; // usually 25
    maxTimeoutsPerTeam: number; // e.g., 2
    timeoutDurationSeconds: number; // usually 60
    maxSubstitutionsPerTeam: number; // e.g., 8
}

export const DEFAULT_PROFILES: MatchProfile[] = [
    {
        id: 'standard_ikf',
        name: 'Standard IKF Match',
        description: 'Official Senior Rules. 2x 25 minutes. 25-second shot clock.',
        periods: 2,
        periodDurationSeconds: 1500,
        hasShotClock: true,
        shotClockDurationSeconds: 25,
        maxTimeoutsPerTeam: 2,
        timeoutDurationSeconds: 60,
        maxSubstitutionsPerTeam: 8
    },
    {
        id: 'youth_u15',
        name: 'Youth (U15) Match',
        description: 'Modified rules. 2x 25 minutes. No shot clock.',
        periods: 2,
        periodDurationSeconds: 1500,
        hasShotClock: false,
        shotClockDurationSeconds: 0,
        maxTimeoutsPerTeam: 1,
        timeoutDurationSeconds: 60,
        maxSubstitutionsPerTeam: 8
    },
    {
        id: 'training_short',
        name: 'Short Scrimmage',
        description: 'Quick 10-minute training match with a fast 20s shot clock.',
        periods: 1,
        periodDurationSeconds: 600,
        hasShotClock: true,
        shotClockDurationSeconds: 20,
        maxTimeoutsPerTeam: 1,
        timeoutDurationSeconds: 30,
        maxSubstitutionsPerTeam: 99
    }
];
