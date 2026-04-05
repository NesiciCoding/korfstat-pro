import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateJSON, generatePDF, generateMatchDayProgram, generateScoutingPDF } from '../reportGenerator';

// Mock jsPDF
const mockJsPDF = {
    text: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    save: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
};

vi.mock('jspdf', () => {
    return {
        default: class {
            constructor() { return mockJsPDF; }
            static API = {
                events: {
                    on: vi.fn()
                }
            };
        }
    };
});

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => {
    return {
        default: vi.fn().mockImplementation((doc, options) => {
            // @ts-ignore
            doc.lastAutoTable = { finalY: 100 };
        })
    };
});

describe('reportGenerator', () => {
    const mockMatch: any = {
        id: 'm1',
        date: Date.now(),
        homeTeam: { name: 'Home', players: [{ id: 'p1', name: 'P1', number: 1, isStarter: true }] },
        awayTeam: { name: 'Away', players: [{ id: 'p2', name: 'P2', number: 2, isStarter: true }] },
        events: [
            { timestamp: 10, teamId: 'HOME', type: 'SHOT', result: 'GOAL', playerId: 'p1', location: { x: 20, y: 30 } },
            { timestamp: 20, teamId: 'AWAY', type: 'SHOT', result: 'GOAL', playerId: 'p2', location: { x: 80, y: 70 } },
            { timestamp: 30, teamId: 'HOME', type: 'SUBSTITUTION', subInId: 'p3', subOutId: 'p1' }
        ],
        halfDurationSeconds: 1500
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates JSON and triggers download', () => {
        // Mock DOM elements
        const mockAnchor = {
            setAttribute: vi.fn(),
            click: vi.fn(),
            remove: vi.fn(),
        } as any;
        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);

        generateJSON(mockMatch);

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', expect.stringContaining('.json'));
        expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('generates a PDF match report with various events', () => {
        const complexMatch: any = {
            ...mockMatch,
            homeTeam: { 
                ...mockMatch.homeTeam, 
                players: [
                    { id: 'p1', name: 'P1', number: 1, isStarter: true },
                    { id: 'p3', name: 'P3', number: 3, isStarter: false }
                ] 
            },
            awayTeam: {
                ...mockMatch.awayTeam,
                players: [
                    { id: 'p2', name: 'P2', number: 2, isStarter: true },
                    { id: 'p4', name: 'P4', number: 4, isStarter: false }
                ]
            },
            events: [
                { timestamp: 10, teamId: 'HOME', type: 'SHOT', result: 'GOAL', playerId: 'p1', location: { x: 20, y: 30 } },
                { timestamp: 15, teamId: 'HOME', type: 'SHOT', result: 'MISS', playerId: 'p1', location: { x: 25, y: 35 } },
                { timestamp: 20, teamId: 'AWAY', type: 'SHOT', result: 'MISS', playerId: 'p2', location: { x: 80, y: 70 } },
                { timestamp: 30, teamId: 'AWAY', type: 'SUBSTITUTION', subInId: 'p4', subOutId: 'p2' },
                { timestamp: 40, teamId: 'HOME', type: 'REBOUND', playerId: 'p3' },
                { timestamp: 50, teamId: 'AWAY', type: 'TURNOVER', playerId: 'p4' }
            ]
        };
        generatePDF(complexMatch);
        expect(mockJsPDF.save).toHaveBeenCalled();
    });

    it('generates a match day program with reserves', () => {
        const homeWithReserves = {
            ...mockMatch.homeTeam,
            players: [
                { id: 'p1', name: 'P1', number: 1, isStarter: true, gender: 'M' },
                { id: 'p3', name: 'P3', number: 3, isStarter: false, gender: 'F' }
            ]
        };
        generateMatchDayProgram(homeWithReserves, mockMatch.awayTeam, { name: 'Standard' });
        expect(mockJsPDF.save).toHaveBeenCalled();
    });

    it('generates a PDF match report', () => {
        generatePDF(mockMatch);
        expect(mockJsPDF.save).toHaveBeenCalled();
        expect(mockJsPDF.text).toHaveBeenCalledWith(expect.stringContaining('Match Report'), 14, 20);
    });

    it('generates a match day program', () => {
        generateMatchDayProgram(mockMatch.homeTeam, mockMatch.awayTeam, { name: 'Standard' });
        expect(mockJsPDF.save).toHaveBeenCalled();
        expect(mockJsPDF.text).toHaveBeenCalledWith("MATCH DAY PROGRAM", 105, 25, expect.anything());
    });

    it('generates a scouting PDF report', () => {
        const scoutData = {
            teamName: 'Home',
            matchCount: 1,
            avgGoals: 10,
            shootingEfficiency: { total: 50, near: 50, medium: 50, far: 50, penalty: 50, freeThrow: 50, runningIn: 50 },
            rebounds: { avgPerGame: 5 },
            fouls: { avgPerGame: 2 },
            momentum: { firstHalfGoals: 5, secondHalfGoals: 5 },
            topPlayers: [{ name: 'P1', goals: 5, shots: 10, val: 20 }]
        };
        generateScoutingPDF(scoutData, "AI Report Text");
        expect(mockJsPDF.save).toHaveBeenCalled();
        expect(mockJsPDF.text).toHaveBeenCalledWith("SMART SCOUT REPORT", 105, 30, expect.anything());
    });
});
