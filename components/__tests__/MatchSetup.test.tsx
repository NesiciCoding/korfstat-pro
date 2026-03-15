import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MatchSetup from '../MatchSetup';
import { TemplateService } from '../../services/templateService';
import { ClubService } from '../../services/clubService';

// Mock TemplateService
vi.mock('../../services/templateService', () => ({
    TemplateService: {
        getAllTemplates: vi.fn().mockResolvedValue([]),
        saveTemplate: vi.fn().mockResolvedValue(true),
        deleteTemplate: vi.fn().mockResolvedValue(true)
    }
}));

// Mock confirm and alert
const mockConfirm = vi.fn();
const mockAlert = vi.fn();
window.confirm = mockConfirm;
window.alert = mockAlert;

// Mock ClubService
vi.mock('../../services/clubService', () => ({
    ClubService: {
        getAllClubs: vi.fn().mockReturnValue([])
    }
}));

describe('MatchSetup', () => {
    const mockOnStartMatch = vi.fn();
    const mockOnNavigate = vi.fn();
    const mockSavedMatches: any[] = [];

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear localStorage before each test
        localStorage.clear();
    });

    it('renders match configuration title', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        expect(screen.getByText('matchSetup.title')).toBeInTheDocument();
    });

    it('renders both team configuration sections', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        expect(screen.getByText('matchSetup.homeTeam')).toBeInTheDocument();
        expect(screen.getByText('matchSetup.awayTeam')).toBeInTheDocument();
    });

    it('allows setting team names', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const homeNameInput = screen.getByLabelText(/^matchSetup\.homeTeam matchSetup\.teamName$/i);
        const awayNameInput = screen.getByLabelText(/^matchSetup\.awayTeam matchSetup\.teamName$/i);

        act(() => {
            fireEvent.change(homeNameInput, { target: { value: 'Testing Blazers' } });
            fireEvent.change(awayNameInput, { target: { value: 'Testing Stars' } });
        });
 
        expect(homeNameInput).toHaveValue('Testing Blazers');
        expect(awayNameInput).toHaveValue('Testing Stars');
    });

    it('shows 10 default players for each team', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        // Each team should have default players
        const playerInputs = screen.getAllByPlaceholderText('matchSetup.placeholderName');
        expect(playerInputs.length).toBe(20); // 10 per team
    });

    it('displays starters count (8/8)', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        // Both teams should show 8/8 starters
        const starterCounts = screen.getAllByText('8/8');
        expect(starterCounts.length).toBe(2); // One for each team
    });

    it('allows adding new players', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const addHomePlayerBtn = screen.getByLabelText(/matchSetup\.addPlayer matchSetup\.homeTeam/i);
        const initialPlayerCount = screen.getAllByPlaceholderText('matchSetup.placeholderName').length;

        // Add a player to home team
        act(() => {
            fireEvent.click(addHomePlayerBtn);
        });
 
        const newPlayerCount = screen.getAllByPlaceholderText('matchSetup.placeholderName').length;
        expect(newPlayerCount).toBe(initialPlayerCount + 1);
    });

    it('allows removing players', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const initialPlayerCount = screen.getAllByPlaceholderText('matchSetup.placeholderName').length;

        // Find and click first remove button by aria-label
        const removeButtons = screen.getAllByRole('button', { name: /matchSetup\.removePlayer/i });

        if (removeButtons.length > 0) {
            act(() => {
                fireEvent.click(removeButtons[0]);
            });
 
            const newPlayerCount = screen.getAllByPlaceholderText('matchSetup.placeholderName').length;
            expect(newPlayerCount).toBe(initialPlayerCount - 1);
        }
    });

    it('starts match when start button is clicked', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const startButton = screen.getByRole('button', { name: /matchSetup\.startMatch/i });
        act(() => {
            fireEvent.click(startButton);
        });
 
        expect(mockOnStartMatch).toHaveBeenCalled();

        // Verify the callback receives correct parameters
        const callArgs = mockOnStartMatch.mock.calls[0];
        expect(callArgs[0]).toHaveProperty('id', 'HOME');
        expect(callArgs[1]).toHaveProperty('id', 'AWAY');
        // By default, the first profile is active which has 25 minutes.
        expect(callArgs[2]).toHaveProperty('id', 'standard_ikf');
        expect(callArgs[3]).toBeUndefined();
    });

    it('submits a selected match configuration profile', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        fireEvent.change(screen.getByLabelText('matchSetup.homeTeam matchSetup.teamName'), { target: { value: 'Test Home' } });
        fireEvent.change(screen.getByLabelText('matchSetup.awayTeam matchSetup.teamName'), { target: { value: 'Test Away' } });

        // Select the Short Scrimmage profile
        const profileButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Short Scrimmage'));
        if (profileButtons.length > 0) {
           act(() => {
               fireEvent.click(profileButtons[0]);
           });
        }
 
        act(() => {
            fireEvent.click(screen.getByText('matchSetup.startMatch'));
        });

        expect(mockOnStartMatch).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Test Home' }),
            expect.objectContaining({ name: 'Test Away' }),
            expect.objectContaining({ id: 'training_short' }),
            undefined
        );
    });

    it('allows changing team colors', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const colorInputs = screen.getAllByTitle(/matchSetup\.primaryColorTitle/i);
        expect(colorInputs.length).toBe(2);

        act(() => {
            fireEvent.change(colorInputs[0], { target: { value: '#00ff00' } });
        });
        expect(colorInputs[0]).toHaveValue('#00ff00');
    });

    it('displays gender mix for starters', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        // Should show male/female breakdown
        const genderBadges = screen.getAllByText(/\d+ M/);
        expect(genderBadges.length).toBeGreaterThan(0);
    });

    it('allows updating player number', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const numberInputs = screen.getAllByPlaceholderText('#');
        const firstNumberInput = numberInputs[0];

        act(() => {
            fireEvent.change(firstNumberInput, { target: { value: '99' } });
        });
        expect(firstNumberInput).toHaveValue(99);
    });

    it('allows updating player name', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });

        const nameInputs = screen.getAllByPlaceholderText('matchSetup.placeholderName');
        const firstNameInput = nameInputs[0];

        act(() => {
            fireEvent.change(firstNameInput, { target: { value: 'John Doe' } });
        });
        expect(firstNameInput).toHaveValue('John Doe');
    });

    it('prepares teams with onField status for starters', () => {
        act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} savedMatches={mockSavedMatches} />);
        });

        const startButton = screen.getByRole('button', { name: /matchSetup\.startMatch/i });
        act(() => {
            fireEvent.click(startButton);
        });

        const homeTeam = mockOnStartMatch.mock.calls[0][0];
        const starters = homeTeam.players.filter((p: any) => p.onField);

        // Should have 8 starters on field
        expect(starters.length).toBe(8);
    });

    describe('Team Snapshot Management', () => {
        it('saves a team snapshot', () => {
            act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });
            
            const saveBtns = screen.getAllByTitle(/matchSetup\.saveAsClub/i);
            act(() => {
                fireEvent.click(saveBtns[0]); // Home team
            });
            
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('matchSetup.teamSaved'));
            const saved = JSON.parse(localStorage.getItem('korfstat_saved_teams') || '[]');
            expect(saved.length).toBe(1);
        });

        it('loads a team snapshot', () => {
            const savedTeam = {
                id: 'st1',
                name: 'Saved Home Team',
                color: '#123456',
                secondaryColor: '#654321',
                players: [{ id: 'p1', name: 'Saved Player', number: 1, gender: 'M', initialPosition: 'ATTACK', isStarter: true }]
            };
            localStorage.setItem('korfstat_saved_teams', JSON.stringify([savedTeam]));
            
            act(() => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        });
            
            // Open load menu
            const loadBtns = screen.getAllByTitle(/matchSetup\.loadSaved/i);
            act(() => {
                fireEvent.click(loadBtns[0]);
            });
            
            // Click the saved team
            const teamBtn = screen.getByText('Saved Home Team');
            act(() => {
                fireEvent.click(teamBtn);
            });
            
            expect(screen.getByDisplayValue('Saved Home Team')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Saved Player')).toBeInTheDocument();
        });
    });

    describe('Club Integration', () => {
        it('loads colors and players from a club', () => {
            const mockClub = {
                id: 'c1',
                name: 'Pro Club',
                primaryColor: '#aabbcc',
                secondaryColor: '#ddeeff',
                logoUrl: 'logo.png',
                players: [{ id: 'cp1', firstName: 'Club', lastName: 'Player', shirtNumber: 7, gender: 'M', positions: ['ATTACK'] }]
            };
            vi.mocked(ClubService.getAllClubs).mockReturnValue([mockClub] as any);
            
            act(() => {
                render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            });
            
            // Open club menu
            const clubBtns = screen.getAllByTitle(/matchSetup\.loadClub/i);
            act(() => {
                fireEvent.click(clubBtns[0]);
            });
            
            // Click the club
            const clubBtn = screen.getByText('Pro Club');
            act(() => {
                fireEvent.click(clubBtn);
            });
            
            expect(screen.getByDisplayValue('Pro Club')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Club Player')).toBeInTheDocument();
        });
    });

    describe('Template Management', () => {
        it('saves a match template', async () => {
            act(() => {
                render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            });
            
            const templateNameInput = screen.getByPlaceholderText('matchSetup.templateName');
            act(() => {
                fireEvent.change(templateNameInput, { target: { value: 'Finals Template' } });
            });
            
            const saveBtn = screen.getByText('common.save');
            act(() => {
                fireEvent.click(saveBtn);
            });
            
            expect(TemplateService.saveTemplate).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Finals Template'
            }));
        });

        it('loads a match template', async () => {
            const mockTemplate = {
                id: 't1',
                name: 'Load Me',
                homeTeam: { name: 'Template Home', color: '#111', players: [] },
                awayTeam: { name: 'Template Away', color: '#222', players: [] },
                profileId: 'standard_ikf'
            };
            vi.mocked(TemplateService.getAllTemplates).mockResolvedValue([mockTemplate] as any);
            
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            
            // Open template menu
            const loadBtn = screen.getByRole('button', { name: /matchSetup\.loadTemplate/i });
            act(() => {
                fireEvent.click(loadBtn);
            });
            
            // Wait for templates to load and click
            const templateBtn = await screen.findByText('Load Me');
            act(() => {
                fireEvent.click(templateBtn);
            });
            
            expect(screen.getByDisplayValue('Template Home')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Template Away')).toBeInTheDocument();
        });
    });
});
