import { MatchState, TeamId } from '../types';

export const getScore = (matchState: MatchState, teamId: TeamId): number => {
    return matchState.events.filter(e => e.teamId === teamId && e.result === 'GOAL').length;
};

export const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
