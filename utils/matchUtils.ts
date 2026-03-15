import { MatchState, TeamId } from '../types';

export const getScore = (matchState: MatchState, teamId: TeamId): number => {
    return (matchState.events || []).filter(e => e.teamId === teamId && e.result === 'GOAL').length;
};

export const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Calculates shot density/momentum over time.
 * Returns an array of shot counts for each 1-minute interval.
 */
export const getMomentumData = (matchState: MatchState): { minute: number, homeShots: number, awayShots: number }[] => {
    // Determine match duration (approx 2 halves of 25m = 50m)
    const totalDuration = matchState.timer.elapsedSeconds;
    const totalMinutes = Math.max(Math.ceil(totalDuration / 60), 10); // Minimum 10 bars for visual consistency
    
    const data = Array.from({ length: totalMinutes }, (_, i) => ({
        minute: i,
        homeShots: 0,
        awayShots: 0
    }));

    (matchState.events || []).forEach(e => {
        if (e.type === 'SHOT') {
            const minute = Math.min(Math.floor(e.timestamp / 60), totalMinutes - 1);
            if (e.teamId === 'HOME') data[minute].homeShots++;
            else data[minute].awayShots++;
        }
    });

    return data;
};
