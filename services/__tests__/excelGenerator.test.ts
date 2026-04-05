import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateExcel } from '../excelGenerator';
import * as XLSX from 'xlsx';
import { MatchState } from '../../types';

// Mock XLSX
vi.mock('xlsx', () => ({
    utils: {
        book_new: vi.fn(() => ({})),
        aoa_to_sheet: vi.fn((data) => ({ _data: data })),
        json_to_sheet: vi.fn((data) => ({ _data: data })),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
}));

describe('excelGenerator', () => {
    const mockMatchState: MatchState = {
        id: 'match-123',
        date: 1678888888888,
        homeTeam: {
            id: 'HOME',
            name: 'Home Blazers',
            players: [
                { id: 'p1', name: 'Player 1', number: 10, gender: 'M', isStarter: true } as any
            ],
            color: '#ff0000'
        },
        awayTeam: {
            id: 'AWAY',
            name: 'Away Stars',
            players: [
                { id: 'p2', name: 'Player 2', number: 20, gender: 'F', isStarter: true } as any
            ],
            color: '#0000ff'
        },
        events: [
            { id: 'e1', type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'p1', timestamp: 120, half: 1 } as any,
            { id: 'e2', type: 'REBOUND', teamId: 'AWAY', playerId: 'p2', timestamp: 125, half: 1 } as any,
        ],
        timer: { elapsedSeconds: 3600, isRunning: false },
        currentHalf: 2
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a new workbook and appends three sheets', () => {
        generateExcel(mockMatchState);

        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);
        // Summary, Player Stats, Event Log
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), "Summary");
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), "Player Stats");
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), "Event Log");
    });

    it('correctly calculates summary scores', () => {
        generateExcel(mockMatchState);

        const summaryCall = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls[0][0];
        // Score rows are at index 5 (Home) and 6 (Away)
        expect(summaryCall[5]).toContain(1); // Home Score
        expect(summaryCall[6]).toContain(0); // Away Score
    });

    it('generates player stats with VAL and +/-', () => {
        generateExcel(mockMatchState);

        const playerStatsCall = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
        const p1Stats = playerStatsCall.find(p => p.Name === 'Player 1');
        
        expect(p1Stats).toBeDefined();
        expect(p1Stats?.Goals).toBe(1);
        expect(p1Stats?.VAL).toBe(5); // 1 Goal * 5
        expect(p1Stats?.['+/-']).toBe(1); // 1 Goal for HOME while on field
    });

    it('writes the file with correct name', () => {
        generateExcel(mockMatchState);
        
        expect(XLSX.writeFile).toHaveBeenCalled();
        const fileName = vi.mocked(XLSX.writeFile).mock.calls[0][1];
        expect(fileName).toMatch(/korfstat_export_\d{4}-\d{2}-\d{2}\.xlsx/);
    });
});
