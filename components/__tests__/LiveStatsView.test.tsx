import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveStatsView from '../LiveStatsView';
import { MatchState, Team, MatchEvent } from '../../types';

// Mock useSettings
vi.mock('../../contexts/SettingsContext', async () => {
    return {
        SettingsProvider: ({ children }: any) => children,
        useSettings: vi.fn(() => ({
            settings: {
                sponsorLogos: [],
                sponsorRotationInterval: 10,
                theme: 'light',
                language: 'en'
            },
            updateSettings: vi.fn(),
            resetSettings: vi.fn(),
            clearAllData: vi.fn()
        }))
    };
});

describe('LiveStatsView', () => {
    const createMockMatchState = (overrides: Partial<MatchState> = {}): MatchState => {
        const homeTeam: Team = {
            id: 'HOME',
            name: 'Home Blazers',
            players: [
                { id: '1', name: 'John Doe', number: 10, gender: 'M', initialPosition: 'ATTACK', isStarter: true },
                { id: '2', name: 'Jane Smith', number: 7, gender: 'F', initialPosition: 'DEFENSE', isStarter: true }
            ],
            color: '#ff0000',
            substitutionCount: 0
        };

        const awayTeam: Team = {
            id: 'AWAY',
            name: 'Away Stars',
            players: [
                { id: '3', name: 'Bob Johnson', number: 15, gender: 'M', initialPosition: 'ATTACK', isStarter: true },
                { id: '4', name: 'Alice Williams', number: 22, gender: 'F', initialPosition: 'DEFENSE', isStarter: true }
            ],
            color: '#0000ff',
            substitutionCount: 0
        };

        return {
            id: 'test-match',
            isConfigured: true,
            halfDurationSeconds: 1800,
            homeTeam,
            awayTeam,
            events: [],
            currentHalf: 1,
            possession: 'HOME',
            timer: { elapsedSeconds: 300, isRunning: true },
            shotClock: { seconds: 20, isRunning: true },
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
            ...overrides
        };
    };

    it('renders team names correctly', () => {
        const matchState = createMockMatchState();
        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText(/Home Blazers/i)).toBeInTheDocument();
        expect(screen.getByText(/Away Stars/i)).toBeInTheDocument();
    });

    it('displays scores for both teams', () => {
        const matchState = createMockMatchState({
            events: [
                {
                    id: '1',
                    type: 'SHOT',
                    teamId: 'HOME',
                    playerId: '1',
                    timestamp: 100,
                    realTime: Date.now(),
                    half: 1,
                    result: 'GOAL',
                    shotType: 'NEAR'
                },
                {
                    id: '2',
                    type: 'SHOT',
                    teamId: 'AWAY',
                    playerId: '3',
                    timestamp: 150,
                    realTime: Date.now(),
                    half: 1,
                    result: 'GOAL',
                    shotType: 'FAR'
                }
            ]
        });

        render(<LiveStatsView matchState={matchState} />);
        // Scores should be displayed (both teams have 1 goal)
        const scoreElements = screen.getAllByText('1');
        expect(scoreElements.length).toBeGreaterThanOrEqual(2);
    });

    it('displays game clock correctly', () => {
        const matchState = createMockMatchState({
            halfDurationSeconds: 1800,
            timer: { elapsedSeconds: 300, isRunning: true }
        });

        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('displays shot clock', () => {
        const matchState = createMockMatchState({
            shotClock: { seconds: 20, isRunning: true }
        });

        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('shows current half number', () => {
        const matchState = createMockMatchState({ currentHalf: 2 });
        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText(/Half 2/i)).toBeInTheDocument();
    });

    it('displays possession indicator for home team', () => {
        const matchState = createMockMatchState({ possession: 'HOME' });
        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText(/POSSESSION/i)).toBeInTheDocument();
    });

    it('shows timeout indicator when timeout is active', () => {
        const matchState = createMockMatchState({
            timeout: { isActive: true, startTime: Date.now(), remainingSeconds: 45 }
        });

        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText(/TIMEOUT 45s/i)).toBeInTheDocument();
    });

    it('displays recent events list', () => {
        const matchState = createMockMatchState({
            events: [
                {
                    id: '1',
                    type: 'SHOT',
                    teamId: 'HOME',
                    playerId: '1',
                    timestamp: 100,
                    realTime: Date.now(),
                    half: 1,
                    result: 'GOAL',
                    shotType: 'NEAR'
                }
            ]
        });

        render(<LiveStatsView matchState={matchState} />);
        expect(screen.getByText(/SHOT/i)).toBeInTheDocument();
        expect(screen.getByText(/GOAL!/i)).toBeInTheDocument();
    });

    it('limits events display to last 5 events', () => {
        const events: MatchEvent[] = Array.from({ length: 10 }, (_, i) => ({
            id: `${i + 1}`,
            type: 'SHOT',
            teamId: 'HOME',
            playerId: '1',
            timestamp: i * 10,
            realTime: Date.now(),
            half: 1,
            result: 'GOAL',
            shotType: 'NEAR'
        }));

        const matchState = createMockMatchState({ events });
        const { container } = render(<LiveStatsView matchState={matchState} />);
        
        // Count elements with the event item class
        const eventItems = container.querySelectorAll('.animate-in');
        expect(eventItems.length).toBe(5);
    });
});
