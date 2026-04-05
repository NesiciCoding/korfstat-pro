import { describe, it, expect } from 'vitest';
import { getTickerData } from '../index.js';

describe('Server Ticker Logic', () => {
    const mockMatchState = {
        id: 'm1',
        homeTeam: { name: 'Royals', color: '#ff0000', players: [{ id: 'p1', name: 'Alice' }] },
        awayTeam: { name: 'Wolves', color: '#0000ff', players: [{ id: 'p2', name: 'Bob' }] },
        events: [
            { type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'p1', timestamp: 100 },
            { type: 'SHOT', result: 'MISS', teamId: 'HOME', playerId: 'p1', timestamp: 200 },
            { type: 'SHOT', result: 'GOAL', teamId: 'AWAY', playerId: 'p2', timestamp: 300 }
        ],
        timer: { elapsedSeconds: 120, isRunning: true },
        period: 1,
        timeRemaining: 1380, // 23:00
        timerRunning: true
    };

    it('should correctly derive scores from events', () => {
        const data = getTickerData(mockMatchState);
        expect(data.score.home).toBe(1);
        expect(data.score.away).toBe(1);
        expect(data.score.homeTeam).toBe('Royals');
    });

    it('should include the last significant event', () => {
        const data = getTickerData(mockMatchState);
        expect(data.lastEvent).not.toBeNull();
        expect(data.lastEvent.type).toBe('SHOT');
        expect(data.lastEvent.description).toContain('GOAL by Bob');
    });

    it('should calculate the current minute correctly', () => {
        const data = getTickerData(mockMatchState);
        // Half 1, 23:00 remaining -> (25 - 23) = 2nd minute
        expect(data.clock.currentMinute).toBe(2);
    });

    it('should return null for empty state', () => {
        expect(getTickerData(null)).toBeNull();
    });
});
