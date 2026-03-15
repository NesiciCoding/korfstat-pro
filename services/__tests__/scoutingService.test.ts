import { describe, it, expect } from 'vitest';
import { aggregateTeamData } from '../scoutingService';
import { MatchState } from '../types';

describe('scoutingService', () => {
    const mockPlayers = [
        { id: 'h1', name: 'Home Player 1', number: 1, gender: 'M', initialPosition: 'ATTACK', isStarter: true },
        { id: 'a1', name: 'Away Player 1', number: 1, gender: 'M', initialPosition: 'ATTACK', isStarter: true }
    ];

    const createMockMatch = (homeName: string, awayName: string, events: any[]): MatchState => ({
        id: Math.random().toString(),
        homeTeam: { id: 'HOME', name: homeName, color: 'blue', players: mockPlayers as any, substitutionCount: 0 },
        awayTeam: { id: 'AWAY', name: awayName, color: 'red', players: mockPlayers as any, substitutionCount: 0 },
        clock: { period: 1, timeRemaining: 0, timerRunning: false, currentMinute: 50 },
        events,
        status: 'FINISHED',
        startTime: Date.now(),
        history: []
    });

    it('aggregates data correctly for a team across multiple matches', () => {
        const matches: MatchState[] = [
            createMockMatch('Team A', 'Team B', [
                { type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'h1', shotType: 'NEAR', half: 1 },
                { type: 'SHOT', result: 'MISS', teamId: 'HOME', playerId: 'h1', shotType: 'FAR', half: 1 },
                { type: 'REBOUND', teamId: 'HOME', playerId: 'h1' },
                { type: 'FOUL', teamId: 'HOME', playerId: 'h1' }
            ]),
            createMockMatch('Team C', 'Team A', [
                { type: 'SHOT', result: 'GOAL', teamId: 'AWAY', playerId: 'a1', shotType: 'MEDIUM', half: 2 },
                { type: 'TURNOVER', teamId: 'AWAY', playerId: 'a1' }
            ])
        ];

        const data = aggregateTeamData('Team A', matches);

        expect(data.teamName).toBe('Team A');
        expect(data.matchCount).toBe(2);
        expect(data.avgGoals).toBe(1); // (1 goal in match 1 + 1 goal in match 2) / 2
        expect(data.rebounds.total).toBe(1);
        expect(data.fouls.total).toBe(1);
        expect(data.shootingEfficiency.total).toBe(67); // 2 goals / 3 shots ≈ 66.6%
        expect(data.momentum.firstHalfGoals).toBe(1);
        expect(data.momentum.secondHalfGoals).toBe(1);
        
        // VAL: (Goals * 5) + (Rebounds * 2) - (Misses * 1) - (Turnovers * 3) - (Fouls * 2)
        // Home Player 1: (1*5) + (1*2) - (1*1) - (0*3) - (1*2) = 5+2-1-2 = 4
        // Away Player 1: (1*5) + (0*2) - (0*1) - (1*3) - (0*2) = 5-3 = 2
        expect(data.topPlayers[0].name).toBe('Home Player 1');
        expect(data.topPlayers[0].val).toBe(4);
    });

    it('throws error if no matches found for team', () => {
        expect(() => aggregateTeamData('Unknown Team', [])).toThrow('No match history found for team: Unknown Team');
    });

    it('handles only last 5 matches', () => {
        const matches = Array.from({ length: 10 }).map((_, i) => 
            createMockMatch('Team A', 'Other', [
                { type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'h1', shotType: 'NEAR', half: 1 }
            ])
        );

        const data = aggregateTeamData('Team A', matches);
        expect(data.matchCount).toBe(5);
    });
});
