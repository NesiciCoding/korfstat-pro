import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    generateMatchReport, 
    generateStrategyReport, 
    generateLiveCommentary,
    generateScoutingReport,
    generatePlayerCareerBio
} from '../geminiService';

// Mock GoogleGenAI
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            models = {
                generateContent: (...args: any[]) => mockGenerateContent(...args)
            };
            constructor() {}
        }
    };
});

// Mock LocalStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('geminiService', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_GEMINI_API_KEY', '');
    });
    const mockMatch: any = {
        id: 'm1',
        homeTeam: { name: 'Home', players: [] },
        awayTeam: { name: 'Away', players: [] },
        events: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockGenerateContent.mockReset(); // Use reset to clear implementation/rejection
        mockGenerateContent.mockResolvedValue({ text: 'Mocked AI Response' });
        // Set a mock API key in settings
        localStorage.setItem('korfstat_settings', JSON.stringify({ geminiApiKey: 'test-key' }));
    });

    it('generates a match report', async () => {
        const report = await generateMatchReport(mockMatch);
        expect(report).toBe('Mocked AI Response');
    });

    it('generates a strategy report', async () => {
        const matches = [mockMatch];
        const report = await generateStrategyReport('Home', 'Away', matches);
        expect(report).toBe('Mocked AI Response');
    });

    it('returns info message if no previous matches found for strategy', async () => {
        const report = await generateStrategyReport('Team A', 'Team B', []);
        expect(report).toContain('No previous match data found');
    });

    it('generates live commentary', async () => {
        const report = await generateLiveCommentary(mockMatch);
        expect(report).toBe('Mocked AI Response');
    });

    it('generates scouting report', async () => {
        const scoutData = { teamName: 'Home', matchCount: 1, avgGoals: 10, shootingEfficiency: { total: 50 }, rebounds: { avgPerGame: 5 }, fouls: { avgPerGame: 2 }, momentum: { firstHalfGoals: 5, secondHalfGoals: 5 }, topPlayers: [] };
        const report = await generateScoutingReport(scoutData);
        expect(report).toBe('Mocked AI Response');
    });

    it('generates player career bio', async () => {
        const player = { firstName: 'John', lastName: 'Doe', shirtNumber: '10' };
        const stats: any = { 
            matchesPlayed: 10, 
            goals: 50, 
            shootingPercentage: 40, 
            wins: 5, 
            draws: 2, 
            losses: 3, 
            milestones: [],
            shots: 100,
            penalties: { scored: 0, total: 0 },
            freeKicks: { scored: 0, total: 0 }
        };
        const trend: any = [];
        const report = await generatePlayerCareerBio(player, stats, trend);
        expect(report).toBe('Mocked AI Response');
    });

    it('handles API errors gracefully', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));
        const report = await generateMatchReport(mockMatch);
        expect(report).toContain('Error generating report');
    });

    it('handles matches with events and players', async () => {
        const matchWithEvents: any = {
            id: 'm1',
            homeTeam: { name: 'Home', players: [{ id: 'p1', name: 'Player 1' }] },
            awayTeam: { name: 'Away', players: [] },
            events: [
                { timestamp: 65, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', playerId: 'p1' }
            ],
            currentHalf: 1
        };
        const report = await generateMatchReport(matchWithEvents);
        expect(report).toBe('Mocked AI Response');
        
        const commentary = await generateLiveCommentary(matchWithEvents);
        expect(commentary).toBe('Mocked AI Response');
    });

    it('handles missing API key', async () => {
        localStorage.setItem('korfstat_settings', JSON.stringify({ geminiApiKey: '' }));
        // Also ensure env var is not set if possible, but in Vitest import.meta.env might be fixed
        // We'll just check if it throws when both are missing
        await expect(generateMatchReport(mockMatch)).resolves.toContain('Error generating report');
    });
});
