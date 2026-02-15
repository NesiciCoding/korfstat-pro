import { describe, it, expect } from 'vitest';
import { calculateDerivedMatchState } from '../matchLogic';
import { MatchState } from '../../types';

describe('calculateDerivedMatchState', () => {
    const baseState: MatchState = {
        id: 'test',
        isConfigured: true,
        halfDurationSeconds: 1500,
        homeTeam: { id: 'HOME', name: 'Home', players: [], color: '', substitutionCount: 0 },
        awayTeam: { id: 'AWAY', name: 'Away', players: [], color: '', substitutionCount: 0 },
        events: [],
        currentHalf: 1,
        possession: 'HOME',
        timer: { elapsedSeconds: 10, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
    };

    it('should not change state if timers are not running', () => {
        const now = 1000;
        const derived = calculateDerivedMatchState(baseState, now);
        expect(derived.timer.elapsedSeconds).toBe(10);
        expect(derived.shotClock.seconds).toBe(25);
    });

    it('should advance game timer if running', () => {
        const startTime = 1000;
        const now = 2000; // 1 second later
        const state: MatchState = {
            ...baseState,
            timer: { elapsedSeconds: 10, isRunning: true, lastStartTime: startTime }
        };

        const derived = calculateDerivedMatchState(state, now);
        expect(derived.timer.elapsedSeconds).toBe(11); // 10 + 1
    });

    it('should decrease shot clock if running', () => {
        const startTime = 1000;
        const now = 2000; // 1 second later
        const state: MatchState = {
            ...baseState,
            shotClock: { seconds: 25, isRunning: true, lastStartTime: startTime }
        };

        const derived = calculateDerivedMatchState(state, now);
        expect(derived.shotClock.seconds).toBe(24); // 25 - 1
    });

    it('should handle timeout countdown', () => {
        const startTime = 1000;
        const now = 3000; // 2 seconds later
        const state: MatchState = {
            ...baseState,
            timeout: { isActive: true, startTime: startTime, remainingSeconds: 60 }
        };

        const derived = calculateDerivedMatchState(state, now);
        expect(derived.timeout.remainingSeconds).toBe(58); // 60 - 2
    });
});
