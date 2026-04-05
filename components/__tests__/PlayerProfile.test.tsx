import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/test-utils';
import PlayerProfile from '../PlayerProfile';
import { ClubPlayer } from '../../types/club';
import { MatchState } from '../../types';

describe('PlayerProfile', () => {
    const mockPlayer: ClubPlayer = {
        id: 'player-1',
        firstName: 'Daan',
        lastName: 'Preuninger',
        shirtNumber: 7,
        gender: 'M',
        active: true,
        positions: ['ATTACK']
    };

    const mockMatches: MatchState[] = [
        {
            id: 'match-1',
            isConfigured: true,
            date: Date.now() - 100000,
            homeTeam: {
                id: 'HOME',
                name: 'Fortuna',
                players: [{ ...mockPlayer, onField: true } as any],
                color: '#ff0000'
            },
            awayTeam: {
                id: 'AWAY',
                name: 'DVO',
                players: [],
                color: '#008000'
            },
            events: [
                { id: 'e1', type: 'SHOT', result: 'GOAL', playerId: 'player-1', teamId: 'HOME', timestamp: 100 } as any
            ],
            timer: { elapsedSeconds: 3000, isRunning: false },
            currentHalf: 2
        } as any
    ];

    const mockOnClose = vi.fn();

    it('renders player name and basic stats', () => {
        render(<PlayerProfile player={mockPlayer} matches={mockMatches} onClose={mockOnClose} />);
        
        expect(screen.getByText(/Daan/i)).toBeInTheDocument();
        expect(screen.getByText(/Preuninger/i)).toBeInTheDocument();
        expect(screen.getByText(/7/)).toBeInTheDocument(); // Shirt number
        expect(screen.getByTestId('career-goals')).toHaveTextContent('1');
    });

    it('renders the trend chart container', () => {
        render(<PlayerProfile player={mockPlayer} matches={mockMatches} onClose={mockOnClose} />);
        
        // Check for the mocked recharts container
        const chart = document.querySelector('.line-chart');
        expect(chart).toBeInTheDocument();
    });

    it('shows career milestones if any are achieved', () => {
        render(<PlayerProfile player={mockPlayer} matches={mockMatches} onClose={mockOnClose} />);
        
        expect(screen.getByText(/careerMilestones/i)).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        render(<PlayerProfile player={mockPlayer} matches={mockMatches} onClose={mockOnClose} />);
        
        // Find desktop close button
        const closeButton = screen.getByTestId('player-profile-close-desktop');
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('allows selecting a player for comparison', async () => {
        const otherPlayer: ClubPlayer = { ...mockPlayer, id: 'player-2', firstName: 'Tim' };
        render(
            <PlayerProfile 
                player={mockPlayer} 
                players={[mockPlayer, otherPlayer]} 
                matches={mockMatches} 
                onClose={mockOnClose} 
            />
        );
        
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'player-2' } });
        
        expect(screen.getByText(/Tim/)).toBeInTheDocument();
    });
});
