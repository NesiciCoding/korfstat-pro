import { describe, it, expect } from 'vitest';
import { getPlayerRole, calculateLineupStats, getTotalGoals } from '../lineupUtils';
import { MatchState, Player, MatchEvent } from '../../types';

describe('lineupUtils', () => {
    const mockPlayer = (id: string, initialPosition: 'ATTACK' | 'DEFENSE'): Player => ({
        id,
        name: `Player ${id}`,
        number: id,
        gender: 'MALE',
        onField: true,
        initialPosition,
        stats: { goals: 0, shots: 0, rebounds: 0, fouls: 0, accuracy: 0, val: 0, plusMinus: 0 }
    });

    it('determines player role correctly based on goal count (2-goal rule)', () => {
        const attacker = mockPlayer('1', 'ATTACK');
        const defender = mockPlayer('2', 'DEFENSE');

        // 0-1 goals: No switch
        expect(getPlayerRole(attacker, 0)).toBe('ATTACK');
        expect(getPlayerRole(defender, 0)).toBe('DEFENSE');
        expect(getPlayerRole(attacker, 1)).toBe('ATTACK');

        // 2-3 goals: Switch
        expect(getPlayerRole(attacker, 2)).toBe('DEFENSE');
        expect(getPlayerRole(defender, 2)).toBe('ATTACK');
        expect(getPlayerRole(attacker, 3)).toBe('DEFENSE');

        // 4-5 goals: Switch back
        expect(getPlayerRole(attacker, 4)).toBe('ATTACK');
        expect(getPlayerRole(defender, 4)).toBe('DEFENSE');
    });

    it('calculates total goals from match state', () => {
        const mockMatch = {
            events: [
                { type: 'SHOT', result: 'GOAL' },
                { type: 'SHOT', result: 'MISS' },
                { type: 'SHOT', result: 'GOAL' }
            ]
        } as unknown as MatchState;
        expect(getTotalGoals(mockMatch)).toBe(2);
    });

    it('calculates lineup stats correctly through match replay', () => {
        const players = [
            mockPlayer('H1', 'ATTACK'), mockPlayer('H2', 'ATTACK'), mockPlayer('H3', 'ATTACK'), mockPlayer('H4', 'ATTACK'),
            mockPlayer('H5', 'DEFENSE'), mockPlayer('H6', 'DEFENSE'), mockPlayer('H7', 'DEFENSE'), mockPlayer('H8', 'DEFENSE'),
            mockPlayer('A1', 'ATTACK'), mockPlayer('A2', 'ATTACK'), mockPlayer('A3', 'ATTACK'), mockPlayer('A4', 'ATTACK'),
            mockPlayer('A5', 'DEFENSE'), mockPlayer('A6', 'DEFENSE'), mockPlayer('A7', 'DEFENSE'), mockPlayer('A8', 'DEFENSE'),
        ];

        const homeTeam = { name: 'Home', players: players.slice(0, 8) };
        const awayTeam = { name: 'Away', players: players.slice(8, 16) };

        const events: MatchEvent[] = [
            // Goal 1: Home Attack Pack scores (H1-H4)
            { id: '1', timestamp: 10, type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'H1' } as MatchEvent,
            // Goal 2: Away Attack Pack scores (A1-A4)
            { id: '2', timestamp: 20, type: 'SHOT', result: 'GOAL', teamId: 'AWAY', playerId: 'A1' } as MatchEvent,
            // Goal 3: Switch has happened! Home Attack is now H5-H8.
            { id: '3', timestamp: 30, type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'H5' } as MatchEvent,
        ];

        const mockState = {
            homeTeam,
            awayTeam,
            events,
            timer: { elapsedSeconds: 60 }
        } as unknown as MatchState;

        const stats = calculateLineupStats(mockState);
        
        // Home Pack 1 (H1-H4):
        // Goal 1: Scored as Attack (+1)
        // Goal 2: Not involved (they were Attack, Away was attacking Defense)
        // Goal 3: Now Defense, but not scored against.
        const homePack1 = stats.find(s => s.playerNames.includes('Player H1'));
        expect(homePack1?.goalsFor).toBe(1);
        expect(homePack1?.plusMinus).toBe(1);

        // Home Pack 2 (H5-H8):
        // Goal 1: Not involved (they were Defense, but Home scored)
        // Goal 2: Conceded as Defense (-1)
        // Goal 3: Scored as Attack (+1)
        // Total: 0
        const homePack2 = stats.find(s => s.playerNames.includes('Player H5'));
        expect(homePack2?.goalsFor).toBe(1);
        expect(homePack2?.goalsAgainst).toBe(1);
        expect(homePack2?.plusMinus).toBe(0);
    });
});
