import { describe, it, expect } from 'vitest';
import { 
    calculateCareerStats, 
    getPlayerTrend, 
    calculateMatchPlusMinus,
    calculatePlayerMatchStats 
} from '../statsCalculator';
import { MatchState } from '../../types';

describe('statsCalculator', () => {

    const createMockMatch = (id: string, homeTeam: any, awayTeam: any, events: any[]): MatchState => ({
        id,
        isConfigured: true,
        date: 1672531200000, // Jan 1 2023
        halfDurationSeconds: 1500,
        homeTeam: { id: 'HOME', name: 'Home', color: '#f00', substitutionCount: 0, ...homeTeam },
        awayTeam: { id: 'AWAY', name: 'Away', color: '#00f', substitutionCount: 0, ...awayTeam },
        events,
        currentHalf: 1,
        possession: 'HOME',
        timer: { elapsedSeconds: 0, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
    });

    const player1 = { id: 'p1', name: 'Player One', number: '1', gender: 'M', active: true, positions: [], isStarter: true };
    const player2 = { id: 'p2', name: 'Player Two', number: '2', gender: 'F', active: true, positions: [], isStarter: true };
    const player3 = { id: 'p3', name: 'Player Three', number: '3', gender: 'M', active: true, positions: [], isStarter: false }; // Bench

    const mockMatches = [
        createMockMatch('m1', 
            { players: [player1] }, 
            { players: [player2] }, 
            [
                { id: '1', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL', shotType: 'NEAR' },
                { id: '2', timestamp: 20, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'MISS', shotType: 'PENALTY' },
                { id: '3', timestamp: 30, type: 'SHOT', playerId: 'p2', teamId: 'AWAY', result: 'GOAL', shotType: 'FREE_THROW' },
            ]
        ),
        createMockMatch('m2', 
            { players: [player2] }, 
            { players: [player1] }, 
            [
                { id: '4', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'AWAY', result: 'GOAL', shotType: 'FAR' },
                { id: '5', timestamp: 20, type: 'SHOT', playerId: 'p1', teamId: 'AWAY', result: 'GOAL', shotType: 'PENALTY' },
            ]
        )
    ];

    describe('calculateCareerStats', () => {
        it('returns zero stats if no matches', () => {
            const stats = calculateCareerStats('p1', []);
            expect(stats.matchesPlayed).toBe(0);
        });

        it('calculates correct stats across multiple matches', () => {
            const stats = calculateCareerStats('p1', mockMatches);
            expect(stats.matchesPlayed).toBe(2);
            expect(stats.goals).toBe(3); // 1 in m1, 2 in m2
            expect(stats.shots).toBe(4); // 2 in m1, 2 in m2
            expect(stats.shootingPercentage).toBe(75); // 3/4 = 75%
            expect(stats.penalties.total).toBe(2);
            expect(stats.penalties.scored).toBe(1);
            expect(stats.wins).toBe(1); // m2 win
            expect(stats.draws).toBe(1); // m1 draw
            // Let's verify.
        });
    });

    describe('getPlayerTrend', () => {
        it('calculates trend point per match correctly', () => {
            const trend = getPlayerTrend('p1', mockMatches);
            expect(trend.length).toBe(2);
            expect(trend[0].goals).toBe(1); // m1
            expect(trend[0].result).toBe('D');
            expect(trend[1].goals).toBe(2); // m2
            expect(trend[1].result).toBe('W');
        });
    });

    describe('calculateMatchPlusMinus', () => {
        it('tracks plus minus based on goals and substitutions', () => {
            const match = createMockMatch('m3',
                { players: [player1, player3] }, // p1 starter, p3 bench
                { players: [player2] }, // p2 starter
                [
                    { id: 'e1', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL' }, // p1 & p2 on field (+1 p1, -1 p2)
                    { id: 'e2', timestamp: 20, type: 'SUBSTITUTION', teamId: 'HOME', subOutId: 'p1', subInId: 'p3' }, // p3 in, p1 out
                    { id: 'e3', timestamp: 30, type: 'SHOT', playerId: 'p2', teamId: 'AWAY', result: 'GOAL' } // p3 & p2 on field (+1 p2, -1 p3)
                ]
            );

            const plusMinus = calculateMatchPlusMinus(match);
            expect(plusMinus.get('p1')).toBe(1); // was on for 1 goal for, 0 against
            expect(plusMinus.get('p2')).toBe(0); // was on for 1 goal for, 1 against
            expect(plusMinus.get('p3')).toBe(-1); // was on for 0 goals for, 1 against
        });
    });

    describe('calculatePlayerMatchStats', () => {
        it('calculates complex match variables including rating', () => {
            const match = createMockMatch('m4',
                { players: [player1] },
                { players: [player2] },
                [
                    { id: 'e1', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL', shotType: 'NEAR' }, // +5
                    { id: 'e2', timestamp: 20, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'MISS', shotType: 'NEAR' }, // -1
                    { id: 'e3', timestamp: 30, type: 'REBOUND', playerId: 'p1', teamId: 'HOME' }, // +2
                    { id: 'e4', timestamp: 40, type: 'TURNOVER', playerId: 'p1', teamId: 'HOME' }, // -3
                    { id: 'e5', timestamp: 50, type: 'FOUL', playerId: 'p1', teamId: 'HOME' }, // -2
                ]
            );
            const map = new Map();
            map.set('p1', 5);

            const stats = calculatePlayerMatchStats(match.homeTeam, match, map);
            expect(stats[0].rating).toBe(1); // 5 - 1 + 2 - 3 - 2 = 1
            expect(stats[0].plusMinus).toBe(5);
            expect(stats[0].goals).toBe(1);
            expect(stats[0].shots).toBe(2);
            expect(stats[0].percentage).toBe(50);
            expect(stats[0].rebounds).toBe(1);
            expect(stats[0].turnovers).toBe(undefined); // the interface doesn't return turnovers atm just count in rating
        });
    });
});
