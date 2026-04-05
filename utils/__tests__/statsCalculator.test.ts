import { describe, it, expect } from 'vitest';
import { 
    calculateCareerStats, 
    getPlayerTrend, 
    calculateMatchPlusMinus,
    calculatePlayerMatchStats,
    calculatePlayerMilestones
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
            expect(stats.goals).toBe(3); 
            expect(stats.shootingPercentage).toBe(75);
            expect(stats.penalties.total).toBe(2);
            expect(stats.penalties.scored).toBe(1);
            expect(stats.wins).toBe(1);
            expect(stats.draws).toBe(1);
        });

        it('tracks losses correctly', () => {
            const lossMatch = createMockMatch('m_loss', 
                { players: [player1] }, 
                { players: [player2] }, 
                [{ id: 'e', timestamp: 10, type: 'SHOT', playerId: 'p2', teamId: 'AWAY', result: 'GOAL' }]
            );
            const stats = calculateCareerStats('p1', [lossMatch]);
            expect(stats.losses).toBe(1);
        });

        it('tracks free kick stats correctly', () => {
             const fkMatch = createMockMatch('m_fk', 
                { players: [player1] }, 
                { players: [player2] }, 
                [
                    { id: '1', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL', shotType: 'FREE_THROW' },
                    { id: '2', timestamp: 20, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'MISS', shotType: 'FREE_THROW' },
                ]
            );
            const stats = calculateCareerStats('p1', [fkMatch]);
            expect(stats.freeKicks.total).toBe(2);
            expect(stats.freeKicks.scored).toBe(1);
            expect(stats.freeKicks.missed).toBe(1);
        });
    });

    describe('calculatePlayerMilestones', () => {
        it('awards high tier goal milestone', () => {
            const stats: any = { goals: 1000, matchesPlayed: 1, shootingPercentage: 0 };
            const milestones = calculatePlayerMilestones('p1', [], stats);
            expect(milestones.find(m => m.tier === 'DIAMOND')).toBeDefined();
        });

        it('awards accuracy milestone after 5 matches', () => {
            const stats: any = { goals: 0, matchesPlayed: 5, shootingPercentage: 40 };
            const milestones = calculatePlayerMilestones('p1', [], stats);
            expect(milestones.find(m => m.type === 'ACCURACY' && m.tier === 'GOLD')).toBeDefined();
        });

        it('awards bronze iron wall milestone', () => {
            const match = createMockMatch('m_milestone',
                { players: [player1] },
                { players: [player2] },
                Array(15).fill(null).map((_, i) => ({ id: `r${i}`, type: 'REBOUND', playerId: 'p1', teamId: 'HOME', timestamp: i }))
            );
            // Rebounds > 10, Fouls < 20
            const stats = calculateCareerStats('p1', [match]);
            const wallBronze = stats.milestones.find(m => m.id === 'wall-bronze');
            expect(wallBronze).toBeDefined();
        });
    });

    describe('getPlayerTrend', () => {
        it('calculates trend point per match correctly including losses', () => {
            const lossMatch = createMockMatch('m_trend_loss', 
                { players: [player1] }, 
                { players: [player2] }, 
                [{ id: 'e', timestamp: 10, type: 'SHOT', playerId: 'p2', teamId: 'AWAY', result: 'GOAL' }]
            );
            const trend = getPlayerTrend('p1', [lossMatch]);
            expect(trend[0].result).toBe('L');
        });
    });

    describe('calculateMatchPlusMinus', () => {
        it('tracks plus minus with home and away substitutions', () => {
            const match = createMockMatch('m_subs',
                { players: [player1, player3] }, // p1 starter, p3 bench
                { players: [player2] },
                [
                    { id: 'e1', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL' }, // p1 & p2 on field (+1 p1, -1 p2)
                    { id: 'e2', timestamp: 20, type: 'SUBSTITUTION', teamId: 'HOME', subOutId: 'p1', subInId: 'p3' }, // p3 in, p1 out
                    { id: 'e3', timestamp: 30, type: 'SHOT', playerId: 'p2', teamId: 'AWAY', result: 'GOAL' } // p3 & p2 on field (+1 p2, -1 p3)
                ]
            );

            const plusMinus = calculateMatchPlusMinus(match);
            expect(plusMinus.get('p1')).toBe(1);
            expect(plusMinus.get('p3')).toBe(-1);
        });

        it('tracks plus minus with away substitutions', () => {
             const match = createMockMatch('m_away_sub',
                { players: [player1] },
                { players: [player2, player3] }, // player3 is A_bench
                [
                    { id: 'e1', timestamp: 20, type: 'SUBSTITUTION', teamId: 'AWAY', subOutId: 'p2', subInId: 'p3' },
                    { id: 'e2', timestamp: 30, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL' }
                ]
            );

            const plusMinus = calculateMatchPlusMinus(match);
            expect(plusMinus.get('p3')).toBe(-1);
        });
    });

    describe('getPlayerTrend', () => {
        it('sorts matches by date', () => {
            const matches = [
                createMockMatch('late', { players: [player1] }, { players: [player2] }, []),
                createMockMatch('early', { players: [player1] }, { players: [player2] }, [])
            ];
            matches[0].date = 2000;
            matches[1].date = 1000;
            
            const trend = getPlayerTrend('p1', matches);
            expect(trend[0].date).toBe(1000);
            expect(trend[1].date).toBe(2000);
        });
    });

    describe('calculatePlayerMatchStats', () => {
        it('sorts players by rating', () => {
            const match = createMockMatch('m_sort',
                { players: [player1, player3] },
                { players: [player2] },
                [
                    { id: 'e1', timestamp: 10, type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL' }, // rating 5
                    { id: 'e2', timestamp: 20, type: 'SHOT', playerId: 'p3', teamId: 'HOME', result: 'MISS' }, // rating -1
                ]
            );
            const map = new Map();
            map.set('p1', 0); map.set('p3', 0);
            const stats = calculatePlayerMatchStats(match.homeTeam, match, map);
            expect(stats[0].id).toBe('p1');
            expect(stats[1].id).toBe('p3');
        });
    });

    describe('Edge Cases', () => {
        it('tracks plus minus with away goals', () => {
             const match = createMockMatch('m_away_goal',
                { players: [player1] },
                { players: [player2] },
                [{ id: 'e1', timestamp: 10, type: 'SHOT', playerId: 'p2', teamId: 'AWAY', result: 'GOAL' }]
            );
            const plusMinus = calculateMatchPlusMinus(match);
            expect(plusMinus.get('p1')).toBe(-1);
            expect(plusMinus.get('p2')).toBe(1);
        });

        it('handles trends for matches where player did not play', () => {
             const matchNoPlay = createMockMatch('m_noplay',
                { players: [player2] },
                { players: [player3] }, // p3 is Away starter, p1 not in match
                [{ id: 'e1', timestamp: 10, type: 'SHOT', playerId: 'p2', teamId: 'HOME', result: 'GOAL' }]
            );
            const trend = getPlayerTrend('p1', [matchNoPlay]);
            expect(trend).toHaveLength(0);
        });
    });
});
