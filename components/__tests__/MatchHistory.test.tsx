import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import MatchHistory from '../MatchHistory';
import { MatchState } from '../../types';

describe('MatchHistory', () => {
    const mockMatches: MatchState[] = [
        {
            id: 'match-1',
            date: 1678888888888,
            homeTeam: { id: 'HOME', name: 'Home Blazers', players: [], color: '#ff0000' },
            awayTeam: { id: 'AWAY', name: 'Away Stars', players: [], color: '#0000ff' },
            events: [
                { type: 'SHOT', result: 'GOAL', teamId: 'HOME', timestamp: 100 } as any
            ],
            timer: { elapsedSeconds: 3600, isRunning: false },
            currentHalf: 2
        } as any,
        {
            id: 'match-2',
            date: 1678888899999,
            homeTeam: { id: 'HOME', name: 'Team A', players: [], color: '#ff0000' },
            awayTeam: { id: 'AWAY', name: 'Team B', players: [], color: '#0000ff' },
            events: [],
            timer: { elapsedSeconds: 3600, isRunning: false },
            currentHalf: 2
        } as any
    ];

    const mockHandlers = {
        onSelectMatch: vi.fn(),
        onAnalyzeMatch: vi.fn(),
        onScoutTeam: vi.fn(),
        onDeleteMatch: vi.fn(),
        onBack: vi.fn(),
    };

    it('renders "No matches recorded" when list is empty', () => {
        render(<MatchHistory matches={[]} {...mockHandlers} />);
        expect(screen.getByText(/No matches recorded/i)).toBeInTheDocument();
    });

    it('renders a list of matches', () => {
        render(<MatchHistory matches={mockMatches} {...mockHandlers} />);
        expect(screen.getByText('Home Blazers')).toBeInTheDocument();
        expect(screen.getByText('Team A')).toBeInTheDocument();
    });

    it('calls onSelectMatch when a match card is clicked', () => {
        render(<MatchHistory matches={mockMatches} {...mockHandlers} />);
        const card = screen.getByTestId('match-card-match-1');
        fireEvent.click(card);
        expect(mockHandlers.onSelectMatch).toHaveBeenCalledWith(mockMatches[0]);
    });

    it('calls onScoutTeam when scout button is clicked', () => {
        render(<MatchHistory matches={mockMatches} {...mockHandlers} />);
        const scoutBtn = screen.getByTestId('scout-home-match-1');
        fireEvent.click(scoutBtn);
        expect(mockHandlers.onScoutTeam).toHaveBeenCalledWith('Home Blazers');
    });

    it('calls onDeleteMatch when delete button is clicked', () => {
        render(<MatchHistory matches={mockMatches} {...mockHandlers} />);
        const deleteBtn = screen.getByTestId('delete-match-match-1');
        fireEvent.click(deleteBtn);
        expect(mockHandlers.onDeleteMatch).toHaveBeenCalledWith('match-1');
    });

    it('calls onBack when back button is clicked', () => {
        render(<MatchHistory matches={mockMatches} {...mockHandlers} />);
        const backBtn = screen.getByRole('button', { name: '' }); // The one with ArrowLeft
        // Better to use a more specific selector if possible, but let's try the first button
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);
        expect(mockHandlers.onBack).toHaveBeenCalled();
    });
});
