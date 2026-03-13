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
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);
        
        expect(screen.getByText(/HALF 2/i)).toBeInTheDocument();
    });

    it('toggles the game timer', () => {
        const matchState = createMockMatchState({ timer: { elapsedSeconds: 0, isRunning: false } });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        // Find the START button in the Game Clock section specifically
        const startBtn = screen.getAllByRole('button', { name: /START/i })[0];
        fireEvent.click(startBtn);

        expect(mockOnUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
            timer: expect.objectContaining({ isRunning: true })
        }));
    });

    it('toggles the shot clock', () => {
        const matchState = createMockMatchState({ shotClock: { seconds: 25, isRunning: false } });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        // Find the START button in the Shot Clock section
        const startBtn = screen.getAllByRole('button', { name: /START/i })[1];
        fireEvent.click(startBtn);

        expect(mockOnUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
            shotClock: expect.objectContaining({ isRunning: true })
        }));
    });

    it('resets shot clock to 25', () => {
        const matchState = createMockMatchState({ shotClock: { seconds: 12, isRunning: true } });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        const resetBtn = screen.getByText(/RESET 25/i);
        fireEvent.click(resetBtn);

        expect(mockOnUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
            shotClock: expect.objectContaining({ seconds: 25, isRunning: true })
        }));
    });

    it('adjusts game clock via modal', () => {
        const matchState = createMockMatchState({ timer: { elapsedSeconds: 0, isRunning: false }, halfDurationSeconds: 1500 });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        // Open modal
        fireEvent.click(screen.getByText(/ADJUST GAME CLOCK/i));
        
        // Decrement minutes (▲/▼) - we'll just find the buttons
        const downBtn = screen.getAllByText('▼')[0];
        fireEvent.click(downBtn); // 25 -> 24

        // Save
        fireEvent.click(screen.getAllByText('Save')[0]);

        expect(mockOnUpdateMatch).toHaveBeenCalled();
        const newState = mockOnUpdateMatch.mock.calls[0][0];
        expect(newState.timer.elapsedSeconds).toBe(60);
    });

    it('adjusts shot clock via modal', () => {
        const matchState = createMockMatchState({ shotClock: { seconds: 25, isRunning: false } });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        // Open modal
        fireEvent.click(screen.getByText(/CHANGE TIME/i));
        
        // Increment
        fireEvent.click(screen.getByText('+')); // 25 -> 26

        // Save (second Save button if multiple editors open, but only one is here)
        fireEvent.click(screen.getByText('Save'));

        expect(mockOnUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
            shotClock: expect.objectContaining({ seconds: 26 })
        }));
    });

    it('handles disciplinary card assignment', () => {
        const matchState = createMockMatchState({
             homeTeam: {
                ...createMockMatchState().homeTeam,
                players: [
                    { id: 'p1', name: 'John Doe', number: 10, gender: 'M', initialPosition: 'ATTACK', isStarter: true, onField: true }
                ]
            }
        });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        // Start Yellow Card flow
        fireEvent.click(screen.getByText(/Add Yellow Card/i));
        
        // Select Home Team in the modal (the one with the background color)
        const teamBtns = screen.getAllByText('Home Blazers');
        fireEvent.click(teamBtns[teamBtns.length - 1]);
        
        // Select Player 10
        fireEvent.click(screen.getByText('10'));

        expect(mockOnUpdateMatch).toHaveBeenCalled();
        const newState = mockOnUpdateMatch.mock.calls[0][0];
        expect(newState.events.some((e: any) => e.type === 'CARD' && e.cardType === 'YELLOW' && e.playerId === 'p1')).toBe(true);
    });

    it('starts a timeout', () => {
        const matchState = createMockMatchState();
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        fireEvent.click(screen.getByText(/Start 60s Time-out/i));

        expect(mockOnUpdateMatch).toHaveBeenCalled();
        const newState = mockOnUpdateMatch.mock.calls[0][0];
        expect(newState.timeout.isActive).toBe(true);
        expect(newState.events.some((e: any) => e.type === 'TIMEOUT')).toBe(true);
    });

    it('sends haptic signals to referee', () => {
        const mockSendHaptic = vi.fn();
        const matchState = createMockMatchState();
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={mockSendHaptic} />);

        fireEvent.click(screen.getByText(/Ping Timeout/i));
        expect(mockSendHaptic).toHaveBeenCalledWith('TIMEOUT_PING');

        fireEvent.click(screen.getByText(/Ping Sub/i));
        expect(mockSendHaptic).toHaveBeenCalledWith('SUB_PING');
    });

    it('switches possession', () => {
        const matchState = createMockMatchState({ possession: 'HOME' });
        render(<JuryView matchState={matchState} onUpdateMatch={mockOnUpdateMatch} onBack={mockOnBack} sendHapticSignal={vi.fn()} />);

        fireEvent.click(screen.getByText('Away Stars'));

        expect(mockOnUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
            possession: 'AWAY'
        }));
    });
});

