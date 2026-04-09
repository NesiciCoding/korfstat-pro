import { describe, it, expect } from 'vitest';
import {
    generateMatchReport,
    generateStrategyReport,
    generateLiveCommentary,
    generateScoutingReport,
    generatePlayerCareerBio
} from '../insightService';

const mockMatch: any = {
    id: 'm1',
    homeTeam: { name: 'Home', players: [{ id: 'p1', name: 'Player 1' }] },
    awayTeam: { name: 'Away', players: [{ id: 'p2', name: 'Player 2' }] },
    events: [],
    timer: { elapsedSeconds: 1500 }
};

const matchWithEvents: any = {
    id: 'm2',
    homeTeam: { name: 'Eagles', players: [{ id: 'p1', name: 'Alice' }] },
    awayTeam: { name: 'Falcons', players: [{ id: 'p2', name: 'Bob' }] },
    timer: { elapsedSeconds: 2400 },
    events: [
        { id: 'e1', timestamp: 300, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', playerId: 'p1', half: 1 },
        { id: 'e2', timestamp: 600, teamId: 'AWAY', type: 'SHOT', result: 'MISS', shotType: 'FAR', playerId: 'p2', half: 1 },
        { id: 'e3', timestamp: 900, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'MEDIUM', playerId: 'p1', half: 2 },
        { id: 'e4', timestamp: 1200, teamId: 'AWAY', type: 'FOUL', playerId: 'p2', half: 2 },
        { id: 'e5', timestamp: 1500, teamId: 'HOME', type: 'REBOUND', playerId: 'p1', half: 2 },
    ]
};

describe('insightService — generateMatchReport', () => {
    it('returns a markdown string for an empty match', async () => {
        const report = await generateMatchReport(mockMatch);
        expect(typeof report).toBe('string');
        expect(report.length).toBeGreaterThan(0);
        expect(report).toContain('# Match Report');
    });

    it('includes both team names', async () => {
        const report = await generateMatchReport(matchWithEvents);
        expect(report).toContain('Eagles');
        expect(report).toContain('Falcons');
    });

    it('includes Key Statistics section', async () => {
        const report = await generateMatchReport(matchWithEvents);
        expect(report).toContain('Key Statistics');
        expect(report).toContain('Efficiency');
    });

    it('correctly calculates goals in the report', async () => {
        const report = await generateMatchReport(matchWithEvents);
        // Eagles scored 2 goals
        expect(report).toContain('Eagles 2');
    });
});

describe('insightService — generateStrategyReport', () => {
    it('returns no-data message when no H2H matches', async () => {
        const report = await generateStrategyReport('Team A', 'Team B', []);
        expect(report).toContain('No previous match data found');
    });

    it('generates a report from H2H history', async () => {
        const h2hMatch: any = {
            id: 'm3',
            homeTeam: { name: 'Team A', players: [] },
            awayTeam: { name: 'Team B', players: [] },
            timer: { elapsedSeconds: 3000 },
            events: [
                { id: 'e1', timestamp: 300, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
                { id: 'e2', timestamp: 600, teamId: 'AWAY', type: 'SHOT', result: 'GOAL', shotType: 'FAR', half: 1 },
                { id: 'e3', timestamp: 900, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 2 },
            ]
        };
        const report = await generateStrategyReport('Team A', 'Team B', [h2hMatch]);
        expect(report).toContain('# Strategy Report');
        expect(report).toContain('Team A');
        expect(report).toContain('Team B');
        expect(report).toContain('Head-to-Head');
    });
});

describe('insightService — generateLiveCommentary', () => {
    it('returns a fallback for an empty match', async () => {
        const line = await generateLiveCommentary(mockMatch);
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
    });

    it('references the scoring player on a GOAL event', async () => {
        const goalMatch: any = {
            ...matchWithEvents,
            events: [{ id: 'e1', timestamp: 300, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', playerId: 'p1', half: 1 }]
        };
        const line = await generateLiveCommentary(goalMatch);
        expect(line).toContain('Alice');
    });

    it('returns a MISS commentary for a missed shot', async () => {
        const missMatch: any = {
            ...matchWithEvents,
            events: [{ id: 'e2', timestamp: 600, teamId: 'AWAY', type: 'SHOT', result: 'MISS', shotType: 'FAR', playerId: 'p2', half: 1 }]
        };
        const line = await generateLiveCommentary(missMatch);
        expect(typeof line).toBe('string');
    });
});

describe('insightService — generateScoutingReport', () => {
    const scoutData: any = {
        teamName: 'Rivals FC',
        matchCount: 3,
        avgGoals: 7.3,
        shootingEfficiency: { total: 22, near: 40, medium: 20, far: 8, penalty: 75, freeThrow: 15, runningIn: 33 },
        rebounds: { avgPerGame: 4.1, total: 12 },
        fouls: { avgPerGame: 3.5, total: 10 },
        momentum: { firstHalfGoals: 12, secondHalfGoals: 10 },
        topPlayers: [
            { name: 'Jan Jansen', goals: 8, shots: 20, val: 32 },
            { name: 'Kees Bakker', goals: 5, shots: 14, val: 20 },
        ]
    };

    it('returns markdown with all 5 sections', async () => {
        const report = await generateScoutingReport(scoutData);
        expect(report).toContain('Executive Summary');
        expect(report).toContain('Personnel Alert');
        expect(report).toContain('Shot Map Insights');
        expect(report).toContain('Defensive Gaps');
        expect(report).toContain('Tactical Verdict');
    });

    it('names the team correctly', async () => {
        const report = await generateScoutingReport(scoutData);
        expect(report).toContain('Rivals FC');
    });

    it('highlights top players', async () => {
        const report = await generateScoutingReport(scoutData);
        expect(report).toContain('Jan Jansen');
    });
});

describe('insightService — generatePlayerCareerBio', () => {
    const player = { firstName: 'Emma', lastName: 'Visser', shirtNumber: '7' };
    const stats: any = {
        matchesPlayed: 40,
        goals: 62,
        shootingPercentage: 28,
        wins: 24,
        draws: 8,
        losses: 8,
        milestones: [{ id: 'm1', type: 'GOALS', tier: 'GOLD', value: 50, threshold: 50, achievedAt: Date.now() }],
        shots: 220,
        penalties: { scored: 5, total: 6 },
        freeKicks: { scored: 3, total: 5 }
    };
    const trend: any = [
        { date: 1700000000, goals: 2, opponent: 'A', result: 'W', accuracy: 30 },
        { date: 1700086400, goals: 1, opponent: 'B', result: 'L', accuracy: 20 },
        { date: 1700172800, goals: 3, opponent: 'C', result: 'W', accuracy: 35 },
        { date: 1700259200, goals: 2, opponent: 'D', result: 'W', accuracy: 28 },
        { date: 1700345600, goals: 3, opponent: 'E', result: 'W', accuracy: 33 },
    ];

    it('returns a two-paragraph bio', async () => {
        const bio = await generatePlayerCareerBio(player, stats, trend);
        expect(typeof bio).toBe('string');
        expect(bio).toContain('Emma Visser');
        // Two paragraphs separated by double newline
        const paragraphs = bio.split('\n\n').filter(p => p.trim().length > 0);
        expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    });

    it('includes career stats in bio', async () => {
        const bio = await generatePlayerCareerBio(player, stats, trend);
        expect(bio).toContain('40');   // matchesPlayed
        expect(bio).toContain('62');   // goals
    });

    it('works with no trend data', async () => {
        const bio = await generatePlayerCareerBio(player, stats, []);
        expect(typeof bio).toBe('string');
        expect(bio.length).toBeGreaterThan(0);
    });
});
