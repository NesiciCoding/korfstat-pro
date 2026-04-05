import { describe, it, expect } from 'vitest';
import { getPlayerRole, calculateLineupStats, getTotalGoals, getPackByRole, formatTime } from '../lineupUtils';
import { MatchState, Player, MatchEvent } from '../../types';

describe('lineupUtils', () => {
    const mockPlayer = (id: string, initialPosition: 'ATTACK' | 'DEFENSE'): Player => ({
        id,
        name: `Player ${id}`,
        number: parseInt(id.replace(/\D/g, '') || '0'),
        gender: 'M',
        onField: true,
        isStarter: true,
        initialPosition
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

    it('gets pack by role correctly', () => {
        const players = [
            mockPlayer('1', 'ATTACK'),
            mockPlayer('2', 'ATTACK'),
            mockPlayer('3', 'DEFENSE'),
            mockPlayer('4', 'DEFENSE')
        ];
        
        const attackPack = getPackByRole(players, 'ATTACK', 0);
        expect(attackPack).toHaveLength(2);
        expect(attackPack[0].id).toBe('1');
        
        const defensePack = getPackByRole(players, 'DEFENSE', 0);
        expect(defensePack).toHaveLength(2);
        expect(defensePack[0].id).toBe('3');
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

    it('formats time correctly', () => {
        expect(formatTime(60)).toBe('1:00');
        expect(formatTime(125)).toBe('2:05');
        expect(formatTime(9)).toBe('0:09');
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

        // Add H9 as a sub
        const h9 = mockPlayer('H9', 'ATTACK');
        h9.onField = false; // Initially off
        homeTeam.players.push(h9);

        const events: MatchEvent[] = [
            // Goal 1: Home Attack Pack scores (H1-H4)
            { id: '1', timestamp: 10, type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'H1' } as MatchEvent,
            // Goal 2: Away Attack Pack scores (A1-A4)
            { id: '2', timestamp: 20, type: 'SHOT', result: 'GOAL', teamId: 'AWAY', playerId: 'A1' } as MatchEvent,
            // Substitution for Home: H1 out, H9 in
            { id: '3', timestamp: 25, type: 'SUBSTITUTION', teamId: 'HOME', subOutId: 'H1', subInId: 'H9' } as MatchEvent,
            // Substitution for Away: A1 out, A9 in
            { id: '4', timestamp: 28, type: 'SUBSTITUTION', teamId: 'AWAY', subOutId: 'A1', subInId: 'A9' } as MatchEvent,
            // Goal 3: Switch has happened! Home Attack is now H5-H8.
            { id: '5', timestamp: 30, type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'H5' } as MatchEvent,
        ];

        // Add A9 as a sub
        const a9 = mockPlayer('A9', 'ATTACK');
        a9.onField = false;
        awayTeam.players.push(a9);

        const mockState = {
            homeTeam,
            awayTeam,
            events,
            timer: { elapsedSeconds: 60 }
        } as unknown as MatchState;

        const stats = calculateLineupStats(mockState);
        
        // Home Pack 1 (H1-H4):
        // Goal 1: Scored as Attack (+1)
        const homePack1 = stats.find(s => s.playerNames.includes('Player H1'));
        expect(homePack1).toBeDefined();
        expect(homePack1?.goalsFor).toBe(1);
        
        // Home Pack with Sub (H9, H2, H3, H4):
        // H9 is now in the current lineup after timestamp 25.
        const homePackSub = stats.find(s => s.playerNames.includes('Player H9'));
        expect(homePackSub).toBeDefined();
    });
});
