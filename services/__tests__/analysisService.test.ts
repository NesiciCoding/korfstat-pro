import { describe, it, expect } from 'vitest';
import { generateMatchInsights } from '../analysisService';
import { MatchState } from '../../types';

describe('analysisService', () => {
    describe('generateMatchInsights', () => {
        it('should return empty array for null or undefined matchState', () => {
            expect(generateMatchInsights(null as any)).toEqual([]);
            expect(generateMatchInsights(undefined as any)).toEqual([]);
        });

        it('should return empty array for matchState without events', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: [],
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            expect(insights).toEqual([]);
        });

        it('should detect scoring runs (3+ consecutive goals)', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: [
                    { id: '1', timestamp: 10, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '2', timestamp: 20, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '3', timestamp: 30, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    // Add some misses to keep efficiency below 25% and avoid efficiency insight
                    { id: '4', timestamp: 40, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '5', timestamp: 50, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '6', timestamp: 60, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '7', timestamp: 70, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '8', timestamp: 80, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '9', timestamp: 90, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                ],
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            // Should only have scoring run insight, not efficiency (3/9 = 33% but misses come after the run)
            // Actually, efficiency is 3/9 = 33%, which IS > 25%, so we'll get 2 insights
            // Let's just check for the scoring run specifically
            const scoringRunInsight = insights.find(i => i.title === 'Scoring Run');
            expect(scoringRunInsight).toBeDefined();
            expect(scoringRunInsight?.type).toBe('POSITIVE');
            expect(scoringRunInsight?.description).toContain('Home Blazers');
            expect(scoringRunInsight?.description).toContain('finished with 3 unanswered goals');
            expect(scoringRunInsight?.teamId).toBe('HOME');
        });

        it('should detect high shooting efficiency (>25%)', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: [
                    { id: '1', timestamp: 10, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '2', timestamp: 20, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '3', timestamp: 30, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '4', timestamp: 40, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                ],
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            const efficiencyInsight = insights.find(i => i.title === 'High Efficiency');
            expect(efficiencyInsight).toBeDefined();
            expect(efficiencyInsight?.type).toBe('POSITIVE');
            expect(efficiencyInsight?.description).toContain('Home Blazers');
            expect(efficiencyInsight?.description).toContain('50%'); // 2/4 = 50%
        });

        it('should detect poor shooting efficiency (<10%)', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: Array.from({ length: 15 }, (_, i) => ({
                    id: `${i}`,
                    timestamp: i * 10,
                    realTime: Date.now(),
                    half: 1,
                    teamId: 'HOME' as const,
                    playerId: 'p1',
                    type: 'SHOT' as const,
                    result: i === 0 ? ('GOAL' as const) : ('MISS' as const), // 1 goal out of 15 shots
                    shotType: 'RUNNING_IN' as const,
                    location: { x: 50, y: 50 }
                })),
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            const efInsight = insights.find(i => i.title === 'Shooting Struggles');
            expect(efInsight).toBeDefined();
            expect(efInsight?.type).toBe('NEGATIVE');
            expect(efInsight?.description).toContain('Home Blazers');
        });

        it('should detect rebound dominance (2:1 ratio)', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: [
                    ...Array.from({ length: 15 }, (_, i) => ({
                        id: `home-reb-${i}`,
                        timestamp: i * 10,
                        realTime: Date.now(),
                        half: 1,
                        teamId: 'HOME' as const,
                        playerId: 'p1',
                        type: 'REBOUND' as const,
                        reboundType: 'OFFENSIVE' as const,
                        location: { x: 50, y: 50 }
                    })),
                    ...Array.from({ length: 5 }, (_, i) => ({
                        id: `away-reb-${i}`,
                        timestamp: i * 10 + 150,
                        realTime: Date.now(),
                        half: 1,
                        teamId: 'AWAY' as const,
                        playerId: 'p2',
                        type: 'REBOUND' as const,
                        reboundType: 'OFFENSIVE' as const,
                        location: { x: 50, y: 50 }
                    })),
                ],
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            const reboundInsight = insights.find(i => i.title === 'Rebound Dominance');
            expect(reboundInsight).toBeDefined();
            expect(reboundInsight?.type).toBe('POSITIVE');
            expect(reboundInsight?.description).toContain('Home Blazers');
            expect(reboundInsight?.description).toContain('15 rebounds vs 5');
        });

        it('should not detect rebound dominance with insufficient rebounds (<10 total)', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: [
                    { id: '1', timestamp: 10, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: 50, y: 50 } },
                    { id: '2', timestamp: 20, realTime: Date.now(), half: 1, teamId: 'AWAY', playerId: 'p2', type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: 50, y: 50 } },
                ],
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            const reboundInsight = insights.find(i => i.title === 'Rebound Dominance');
            expect(reboundInsight).toBeUndefined();
        });

        it('should detect multiple insights in a single match', () => {
            const matchState: MatchState = {
                isConfigured: true,
                halfDurationSeconds: 1500,
                homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '', substitutionCount: 0 },
                awayTeam: { id: 'AWAY', name: 'Away Giants', players: [], color: '', substitutionCount: 0 },
                events: [
                    // Scoring run for HOME (3 goals)
                    { id: '1', timestamp: 10, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '2', timestamp: 20, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    { id: '3', timestamp: 30, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    // Miss to maintain high efficiency
                    { id: '4', timestamp: 40, realTime: Date.now(), half: 1, teamId: 'HOME', playerId: 'p1', type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } },
                    // Rebounds for HOME dominance
                    ...Array.from({ length: 12 }, (_, i) => ({
                        id: `reb-${i}`,
                        timestamp: 50 + i * 5,
                        realTime: Date.now(),
                        half: 1,
                        teamId: 'HOME' as const,
                        playerId: 'p1',
                        type: 'REBOUND' as const,
                        reboundType: 'OFFENSIVE' as const,
                        location: { x: 50, y: 50 }
                    })),
                    ...Array.from({ length: 3 }, (_, i) => ({
                        id: `away-reb-${i}`,
                        timestamp: 150 + i * 5,
                        realTime: Date.now(),
                        half: 1,
                        teamId: 'AWAY' as const,
                        playerId: 'p2',
                        type: 'REBOUND' as const,
                        reboundType: 'OFFENSIVE' as const,
                        location: { x: 50, y: 50 }
                    })),
                ],
                currentHalf: 1,
                possession: null,
                timer: { elapsedSeconds: 0, isRunning: false },
                shotClock: { seconds: 25, isRunning: false },
                timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            };

            const insights = generateMatchInsights(matchState);
            expect(insights.length).toBeGreaterThanOrEqual(2); // Should have scoring run + rebound dominance at minimum
            expect(insights.some(i => i.title === 'Scoring Run')).toBe(true);
            expect(insights.some(i => i.title === 'Rebound Dominance')).toBe(true);
        });
    });
});
