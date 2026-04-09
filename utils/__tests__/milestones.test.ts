import { describe, it, expect } from 'vitest';
import { calculatePlayerMilestones } from '../statsCalculator';
import { MatchState } from '../../types';
import { PlayerArchetype } from '../../types/stats';

const baseExtendedStats = {
    rebounds: 0,
    turnovers: 0,
    yellowCards: 0,
    redCards: 0,
    careerRating: 0,
    goalsPerMatch: 0,
    goalsFirstHalf: 0,
    goalsSecondHalf: 0,
    shotsByType: {
        NEAR: { shots: 0, goals: 0 },
        MEDIUM: { shots: 0, goals: 0 },
        FAR: { shots: 0, goals: 0 },
        RUNNING_IN: { shots: 0, goals: 0 },
        PENALTY: { shots: 0, goals: 0 },
        FREE_THROW: { shots: 0, goals: 0 },
    },
    bestMatch: null,
    currentGoalStreak: 0,
    longestGoalStreak: 0,
    careerPlusMinus: 0,
    archetype: 'VERSATILE' as PlayerArchetype,
};

describe('calculatePlayerMilestones', () => {
    const playerId = 'player-1';

    it('should identify goal milestones correctly', () => {
        const stats = {
            ...baseExtendedStats,
            matchesPlayed: 10,
            goals: 120,
            shots: 300,
            shootingPercentage: 40,
            penalties: { scored: 0, missed: 0, total: 0 },
            freeKicks: { scored: 0, missed: 0, total: 0 },
            wins: 5,
            losses: 5,
            draws: 0
        };

        const milestones = calculatePlayerMilestones(playerId, [], stats);
        const goalMilestone = milestones.find(m => m.type === 'GOALS');

        expect(goalMilestone).toBeDefined();
        expect(goalMilestone?.tier).toBe('BRONZE');
        expect(goalMilestone?.threshold).toBe(100);
    });

    it('should identify diamond goal milestone for 1000+ goals', () => {
        const stats = {
            ...baseExtendedStats,
            matchesPlayed: 100,
            goals: 1050,
            shots: 3000,
            shootingPercentage: 35,
            penalties: { scored: 0, missed: 0, total: 0 },
            freeKicks: { scored: 0, missed: 0, total: 0 },
            wins: 50,
            losses: 50,
            draws: 0
        };

        const milestones = calculatePlayerMilestones(playerId, [], stats);
        const goalMilestone = milestones.find(m => m.type === 'GOALS');

        expect(goalMilestone?.tier).toBe('DIAMOND');
        expect(goalMilestone?.threshold).toBe(1000);
    });

    it('should identify accuracy milestones', () => {
        const stats = {
            ...baseExtendedStats,
            matchesPlayed: 6, // Min 5 matches
            goals: 45,
            shots: 100,
            shootingPercentage: 45,
            penalties: { scored: 0, missed: 0, total: 0 },
            freeKicks: { scored: 0, missed: 0, total: 0 },
            wins: 3,
            losses: 3,
            draws: 0
        };

        const milestones = calculatePlayerMilestones(playerId, [], stats);
        const accuracyMilestone = milestones.find(m => m.type === 'ACCURACY');

        expect(accuracyMilestone).toBeDefined();
        expect(accuracyMilestone?.tier).toBe('GOLD'); // 45 > 40
    });

    it('should detect clutch performer milestones', () => {
        const mockMatch: MatchState = {
            id: 'm1',
            homeTeam: { id: 'HOME', name: 'Home', players: [{ id: playerId } as any], substitutionCount: 0, color: '#fff' },
            awayTeam: { id: 'AWAY', name: 'Away', players: [], substitutionCount: 0, color: '#000' },
            events: [
                // Score is 0-0. Player-1 scores at timestamp 100.
                { id: 'e1', timestamp: 100, realTime: 100, half: 1, teamId: 'HOME', playerId, type: 'SHOT', result: 'GOAL' }
            ],
            currentHalf: 2,
            possession: null,
            timer: { elapsedSeconds: 1200, isRunning: false },
            shotClock: { seconds: 25, isRunning: false },
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            halfDurationSeconds: 1500,
            isConfigured: true
        };

        const stats = {
            ...baseExtendedStats,
            matchesPlayed: 1,
            goals: 1,
            shots: 1,
            shootingPercentage: 100,
            penalties: { scored: 0, missed: 0, total: 0 },
            freeKicks: { scored: 0, missed: 0, total: 0 },
            wins: 1,
            losses: 0,
            draws: 0
        };

        const milestones = calculatePlayerMilestones(playerId, [mockMatch], stats);
        const clutchMilestone = milestones.find(m => m.type === 'CLUTCH');

        expect(clutchMilestone).toBeDefined();
        expect(clutchMilestone?.tier).toBe('BRONZE'); // 1 game winning goal
    });
});
