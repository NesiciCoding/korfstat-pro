import { MatchState } from '../types';

export const calculateDerivedMatchState = (baseState: MatchState, now: number = Date.now()): MatchState => {
    const derived = { ...baseState };

    // Game Timer
    if (derived.timer.isRunning && derived.timer.lastStartTime && !derived.timeout.isActive) {
        const delta = (now - derived.timer.lastStartTime) / 1000;
        derived.timer = {
            ...derived.timer,
            elapsedSeconds: derived.timer.elapsedSeconds + delta
        };
    }

    // Shot Clock
    if (derived.shotClock.isRunning && derived.shotClock.lastStartTime && !derived.timeout.isActive) {
        const delta = (now - derived.shotClock.lastStartTime) / 1000;
        derived.shotClock = {
            ...derived.shotClock,
            seconds: Math.max(0, derived.shotClock.seconds - delta)
        };
    }

    // Timeout
    if (derived.timeout.isActive) {
        // derived.timeout.remainingSeconds = Math.max(0, 60 - (now - derived.timeout.startTime) / 1000);
        // Logic from App.tsx:
        derived.timeout.remainingSeconds = Math.max(0, 60 - (now - derived.timeout.startTime) / 1000);
    }

    // Break
    if (derived.break && derived.break.isActive) {
        const elapsedSinceStart = (now - derived.break.startTime) / 1000;
        derived.break = {
            ...derived.break,
            durationSeconds: Math.max(0, derived.break.durationSeconds - elapsedSinceStart)
        };
    }

    return derived;
};
