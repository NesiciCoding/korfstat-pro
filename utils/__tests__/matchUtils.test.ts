import { describe, it, expect } from 'vitest';
import { formatTime, getScore } from '../matchUtils';
import { MatchState } from '../../types';

describe('matchUtils', () => {
    describe('formatTime', () => {
        it('formats seconds correctly', () => {
            expect(formatTime(0)).toBe('00:00');
            expect(formatTime(65)).toBe('01:05');
            expect(formatTime(3600)).toBe('60:00');
        });
    });

    describe('getScore', () => {
        const dummyState: MatchState = {
            id: 'test',
            isConfigured: true,
            halfDurationSeconds: 1500,
            homeTeam: { id: 'HOME', name: 'Home', players: [], color: '', substitutionCount: 0 },
            awayTeam: { id: 'AWAY', name: 'Away', players: [], color: '', substitutionCount: 0 },
            events: [
                { id: '1', timestamp: 0, realTime: 0, half: 1, teamId: 'HOME', type: 'SHOT', result: 'GOAL' },
                { id: '2', timestamp: 0, realTime: 0, half: 1, teamId: 'HOME', type: 'SHOT', result: 'MISS' },
                { id: '3', timestamp: 0, realTime: 0, half: 1, teamId: 'AWAY', type: 'SHOT', result: 'GOAL' },
                { id: '4', timestamp: 0, realTime: 0, half: 1, teamId: 'HOME', type: 'SHOT', result: 'GOAL' }
            ],
            currentHalf: 1,
            possession: 'HOME',
            timer: { elapsedSeconds: 0, isRunning: false },
            shotClock: { seconds: 25, isRunning: false },
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
        };

        it('calculates score correctly', () => {
            expect(getScore(dummyState, 'HOME')).toBe(2);
            expect(getScore(dummyState, 'AWAY')).toBe(1);
        });
    });
});
