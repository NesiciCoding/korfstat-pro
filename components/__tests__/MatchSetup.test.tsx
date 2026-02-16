import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchSetup from '../MatchSetup';

describe('MatchSetup', () => {
    const mockOnStartMatch = vi.fn();
    const mockSavedMatches: any[] = [];

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear localStorage before each test
        localStorage.clear();
    });

    it('renders match configuration title', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        expect(screen.getByText('Match Configuration')).toBeInTheDocument();
    });

    it('renders both team configuration sections', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        expect(screen.getByText('Home Team')).toBeInTheDocument();
        expect(screen.getByText('Away Team')).toBeInTheDocument();
    });

    it('allows setting team names', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const homeNameInput = screen.getByLabelText(/^Home Team Name$/i);
        const awayNameInput = screen.getByLabelText(/^Away Team Name$/i);

        fireEvent.change(homeNameInput, { target: { value: 'Testing Blazers' } });
        fireEvent.change(awayNameInput, { target: { value: 'Testing Stars' } });

        expect(homeNameInput).toHaveValue('Testing Blazers');
        expect(awayNameInput).toHaveValue('Testing Stars');
    });

    it('allows setting match duration', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        // Select input by aria-label for robustness
        const durationInpt = screen.getByLabelText(/Half Duration/i);

        fireEvent.change(durationInpt, { target: { value: '30' } });

        expect(durationInpt).toHaveValue(30);

        expect(durationInpt).toHaveValue(30);
    });

    it('shows 10 default players for each team', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        // Each team should have default players
        const playerInputs = screen.getAllByPlaceholderText('Name');
        expect(playerInputs.length).toBe(20); // 10 per team
    });

    it('displays starters count (8/8)', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        // Both teams should show 8/8 starters
        const starterCounts = screen.getAllByText('8/8');
        expect(starterCounts.length).toBe(2); // One for each team
    });

    it('allows adding new players', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const addHomePlayerBtn = screen.getByLabelText(/Add Player to Home Team/i);
        const initialPlayerCount = screen.getAllByPlaceholderText('Name').length;

        // Add a player to home team
        fireEvent.click(addHomePlayerBtn);

        const newPlayerCount = screen.getAllByPlaceholderText('Name').length;
        expect(newPlayerCount).toBe(initialPlayerCount + 1);
    });

    it('allows removing players', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const initialPlayerCount = screen.getAllByPlaceholderText('Name').length;

        // Find and click first remove button by aria-label
        const removeButtons = screen.getAllByRole('button', { name: /Remove Player/i });

        if (removeButtons.length > 0) {
            fireEvent.click(removeButtons[0]);

            const newPlayerCount = screen.getAllByPlaceholderText('Name').length;
            expect(newPlayerCount).toBe(initialPlayerCount - 1);
        }
    });

    it('starts match when start button is clicked', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const startButton = screen.getByRole('button', { name: /Start Match/i });
        fireEvent.click(startButton);

        expect(mockOnStartMatch).toHaveBeenCalled();

        // Verify the callback receives correct parameters
        const callArgs = mockOnStartMatch.mock.calls[0];
        expect(callArgs[0]).toHaveProperty('id', 'HOME');
        expect(callArgs[1]).toHaveProperty('id', 'AWAY');
        expect(callArgs[2]).toBe(1500); // 25 minutes * 60 seconds
    });

    it('passes custom duration to onStartMatch', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        // Change duration to 30 minutes
        // Change duration to 30 minutes
        const durationInput = screen.getByLabelText(/Half Duration/i);
        fireEvent.change(durationInput, { target: { value: '30' } });

        const startButton = screen.getByRole('button', { name: /Start Match/i });
        fireEvent.click(startButton);

        // Should be 30 * 60 = 1800 seconds
        expect(mockOnStartMatch).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            1800,
            undefined
        );
    });

    it('allows changing team colors', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const colorInputs = screen.getAllByTitle(/Select Team Color/i);
        expect(colorInputs.length).toBe(2);

        fireEvent.change(colorInputs[0], { target: { value: '#00ff00' } });
        expect(colorInputs[0]).toHaveValue('#00ff00');
    });

    it('displays gender mix for starters', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        // Should show male/female breakdown
        const genderBadges = screen.getAllByText(/\d+ M/);
        expect(genderBadges.length).toBeGreaterThan(0);
    });

    it('allows updating player number', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const numberInputs = screen.getAllByPlaceholderText('#');
        const firstNumberInput = numberInputs[0];

        fireEvent.change(firstNumberInput, { target: { value: '99' } });
        expect(firstNumberInput).toHaveValue(99);
    });

    it('allows updating player name', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const nameInputs = screen.getAllByPlaceholderText('Name');
        const firstNameInput = nameInputs[0];

        fireEvent.change(firstNameInput, { target: { value: 'John Doe' } });
        expect(firstNameInput).toHaveValue('John Doe');
    });

    it('prepares teams with onField status for starters', () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);

        const startButton = screen.getByRole('button', { name: /Start Match/i });
        fireEvent.click(startButton);

        const homeTeam = mockOnStartMatch.mock.calls[0][0];
        const starters = homeTeam.players.filter((p: any) => p.onField);

        // Should have 8 starters on field
        expect(starters.length).toBe(8);
    });
});
