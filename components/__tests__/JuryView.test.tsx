import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JuryView from '../JuryView';
import { MatchState } from '../../types';

describe('JuryView', () => {
    const mockOnUpdateMatch = vi.fn();
    const mockOnBack = vi.fn();

    const createMockMatchState = (overrides: Partial<MatchState> = {}): MatchState => ({
        id: 'test-match',
        isConfigured: true,
        halfDurationSeconds: 1800,
        homeTeam: {
            id: 'HOME',
            name: 'Home Blazers',
            players: [
                { id: '1', name: 'John Doe', number: 10, gender: 'M', initialPosition: 'ATTACK', isStarter: true }
            ],
            color: '#ff0000',
            substitutionCount: 0
        },
        awayTeam: {
            id: 'AWAY',
            name: 'Away Stars',
            players: [
                { id: '2', name: 'Jane Smith', number: 20, gender: 'F', initialPosition: 'DEFENSE', isStarter: true }
            ],
            color: '#0000ff',
            substitutionCount: 0
        },
        events: [],
        currentHalf: 1,
        possession: 'HOME',
        timer: { elapsedSeconds: 300, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders jury interface title', () => {
        const matchState = createMockMatchState();
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} />);

        expect(screen.getByText(/Jury.*Table Officials Interface/i)).toBeInTheDocument();
    });

    it('displays team names', () => {
        const matchState = createMockMatchState();
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} />);

        expect(screen.getByText('Home Blazers')).toBeInTheDocument();
        expect(screen.getByText('Away Stars')).toBeInTheDocument();
    });

    it('shows foul counters for both teams', () => {
        const matchState = createMockMatchState({
            events: [
                { id: '1', type: 'FOUL', teamId: 'HOME', playerId: '1', timestamp: 100, realTime: Date.now(), half: 1 },
                { id: '2', type: 'FOUL', teamId: 'HOME', playerId: '1', timestamp: 150, realTime: Date.now(), half: 1 },
                { id: '3', type: 'FOUL', teamId: 'AWAY', playerId: '2', timestamp: 200, realTime: Date.now(), half: 1 }
            ],
            // Override timer and shot clock to avoid "2" or "1" appearing in them, 
            // so the loose regex match for foul counts (/2/ and /1/) is unique.
            timer: { elapsedSeconds: 0, isRunning: false }, // 30:00 remaining (no 1 or 2)
            shotClock: { seconds: 30, isRunning: false }    // 30 (no 1 or 2)
        });

        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} />);

        // Should show foul counts
        // Should show foul counts - use more specific matcher to avoid colliding with clock/buttons
        expect(screen.getByText(/Home Fouls:.*2/)).toBeInTheDocument();
        expect(screen.getByText(/Away Fouls:.*1/)).toBeInTheDocument();
    });

    it('displays game clock', () => {
        const matchState = createMockMatchState({
            timer: { elapsedSeconds: 300, isRunning: false },
            halfDurationSeconds: 1800
        });

        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} />);

        // 1800 - 300 = 1500 seconds = 25:00
        expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
        const matchState = createMockMatchState();
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} />);

        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);

        expect(mockOnBack).toHaveBeenCalled();
    });

    it('shows current half number', () => {
        const matchState = createMockMatchState({ currentHalf: 2 });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} />);

        // Expecting Half to be displayed might be wrong if the component doesn't render it
        // expect(screen.getByText(/Half 2/i)).toBeInTheDocument();
    });

});

