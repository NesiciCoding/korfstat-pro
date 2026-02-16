import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveStatsView from '../LiveStatsView';
import { MatchState } from '../../types';

describe('LiveStatsView', () => {
    const createMockMatchState = (overrides: Partial<MatchState> = {}): MatchState => ({
        id: 'test-match',
        isConfigured: true,
        halfDurationSeconds: 1800,
        homeTeam: {
            id: 'HOME',
            name: 'Home Blazers',
            players: [
                { id: '1', name: 'John Doe', number: 10 },
                { id: '2', name: 'Jane Smith', number: 7 }
            ],
            color: '#ff0000',
            substitutionCount: 0
        },
        awayTeam: {
            id: 'AWAY',
            name: 'Away Stars',
            players: [
                { id: '3', name: 'Bob Johnson', number: 15 },
                { id: '4', name: 'Alice Williams', number: 22 }
            ],
            color: '#0000ff',
            substitutionCount: 0
        },
        events: [],
        currentHalf: 1,
        possession: 'HOME',
        timer: { elapsedSeconds: 300, isRunning: true },
        shotClock: { seconds: 20, isRunning: true },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
        ...overrides
    });

    it('renders team names correctly', () => {
        const matchState = createMockMatchState();
        render(<LiveStatsView matchState={matchState} />);

        expect(screen.getByText('Home Blazers')).toBeInTheDocument();
        expect(screen.getByText('Away Stars')).toBeInTheDocument();
    });

    it('displays scores for both teams', () => {
        const matchState = createMockMatchState({
            events: [
                {
                    id: '1',
                    type: 'GOAL',
                    teamId: 'HOME',
                    playerId: '1',
                    timestamp: 100,
                    result: 'GOAL',
                    shotType: 'SHORT',
                    currentHalf: 1
                },
                {
                    id: '2',
                    type: 'GOAL',
                    teamId: 'AWAY',
                    playerId: '3',
                    timestamp: 150,
                    result: 'GOAL',
                    shotType: 'LONG',
                    currentHalf: 1
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

        // 1800 - 300 = 1500 seconds = 25:00
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

        const possessionIndicators = screen.getAllByText(/POSSESSION/i);
        expect(possessionIndicators.length).toBe(1);
    });

    it('displays possession indicator for away team', () => {
        const matchState = createMockMatchState({ possession: 'AWAY' });
        render(<LiveStatsView matchState={matchState} />);

        const possessionIndicators = screen.getAllByText(/POSSESSION/i);
        expect(possessionIndicators.length).toBe(1);
    });

    it('shows timeout indicator when timeout is active', () => {
        const matchState = createMockMatchState({
            timeout: { isActive: true, startTime: Date.now(), remainingSeconds: 45 }
        });

        render(<LiveStatsView matchState={matchState} />);

        expect(screen.getByText(/TIMEOUT/i)).toBeInTheDocument();
        expect(screen.getByText(/45s/i)).toBeInTheDocument();
    });

    it('does not show timeout indicator when timeout is inactive', () => {
        const matchState = createMockMatchState({
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
        });

        render(<LiveStatsView matchState={matchState} />);

        expect(screen.queryByText(/TIMEOUT/i)).not.toBeInTheDocument();
    });

    it('displays recent events list', () => {
        const matchState = createMockMatchState({
            events: [
                {
                    id: '1',
                    type: 'GOAL',
                    teamId: 'HOME',
                    playerId: '1',
                    timestamp: 100,
                    result: 'GOAL',
                    shotType: 'SHORT',
                    currentHalf: 1
                },
                {
                    id: '2',
                    type: 'MISS',
                    teamId: 'AWAY',
                    playerId: '3',
                    timestamp: 150,
                    result: 'MISS',
                    shotType: 'LONG',
                    currentHalf: 1
                }
            ]
        });

        render(<LiveStatsView matchState={matchState} />);

        expect(screen.getByText('GOAL')).toBeInTheDocument();
        expect(screen.getByText('MISS')).toBeInTheDocument();
    });

    it('shows "Waiting for match actions" when no events', () => {
        const matchState = createMockMatchState({ events: [] });
        render(<LiveStatsView matchState={matchState} />);

        expect(screen.getByText(/Waiting for match actions/i)).toBeInTheDocument();
    });

    it('limits events display to last 5 events', () => {
        const events = Array.from({ length: 10 }, (_, i) => ({
            id: `${i + 1}`,
            type: 'GOAL',
            teamId: 'HOME' as const,
            playerId: '1',
            timestamp: i * 10,
            result: 'GOAL' as const,
            shotType: 'SHORT' as const,
            currentHalf: 1
        }));

        const matchState = createMockMatchState({ events });
        render(<LiveStatsView matchState={matchState} />);

        // Should only show last 5
        const goalElements = screen.getAllByText('GOAL');
        expect(goalElements.length).toBe(5);
    });
});
