import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

    it('renders match configuration title', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        expect(await screen.findByText('matchSetup.title')).toBeInTheDocument();
    });

    it('renders both team configuration sections', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        expect(await screen.findByText('matchSetup.homeTeam')).toBeInTheDocument();
        expect(await screen.findByText('matchSetup.awayTeam')).toBeInTheDocument();
    });

    it('allows setting team names', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const homeNameInput = await screen.findByLabelText(/^matchSetup\.homeTeam matchSetup\.teamName$/i);
        const awayNameInput = await screen.findByLabelText(/^matchSetup\.awayTeam matchSetup\.teamName$/i);

        fireEvent.change(homeNameInput, { target: { value: 'Testing Blazers' } });
        fireEvent.change(awayNameInput, { target: { value: 'Testing Stars' } });
 
        expect(homeNameInput).toHaveValue('Testing Blazers');
        expect(awayNameInput).toHaveValue('Testing Stars');
    });

    it('shows 10 default players for each team', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        const playerInputs = await screen.findAllByPlaceholderText('matchSetup.placeholderName');
        expect(playerInputs.length).toBe(20);
    });

    it('displays starters count (8/8)', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        const starterCounts = await screen.findAllByText('8/8');
        expect(starterCounts.length).toBe(2);
    });

    it('allows adding new players', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const addHomePlayerBtn = await screen.findByLabelText(/matchSetup\.addPlayer matchSetup\.homeTeam/i);
        const initialPlayerCount = (await screen.findAllByPlaceholderText('matchSetup.placeholderName')).length;

        fireEvent.click(addHomePlayerBtn);
 
        const newPlayerCount = (await screen.findAllByPlaceholderText('matchSetup.placeholderName')).length;
        expect(newPlayerCount).toBe(initialPlayerCount + 1);
    });

    it('allows removing players', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const initialPlayerCount = (await screen.findAllByPlaceholderText('matchSetup.placeholderName')).length;

        const removeButtons = await screen.findAllByRole('button', { name: /matchSetup\.removePlayer/i });

        if (removeButtons.length > 0) {
            fireEvent.click(removeButtons[0]);
 
            const newPlayerCount = (await screen.findAllByPlaceholderText('matchSetup.placeholderName')).length;
            expect(newPlayerCount).toBe(initialPlayerCount - 1);
        }
    });

    it('starts match when start button is clicked', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const startButton = await screen.findByRole('button', { name: /matchSetup\.startMatch/i });
        fireEvent.click(startButton);
 
        expect(mockOnStartMatch).toHaveBeenCalled();

        const callArgs = mockOnStartMatch.mock.calls[0];
        expect(callArgs[0]).toHaveProperty('id', 'HOME');
        expect(callArgs[1]).toHaveProperty('id', 'AWAY');
        expect(callArgs[2]).toHaveProperty('id', 'standard_ikf');
    });

    it('submits a selected match configuration profile', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        fireEvent.change(await screen.findByLabelText('matchSetup.homeTeam matchSetup.teamName'), { target: { value: 'Test Home' } });
        fireEvent.change(await screen.findByLabelText('matchSetup.awayTeam matchSetup.teamName'), { target: { value: 'Test Away' } });

        const profileButtons = (await screen.findAllByRole('button')).filter(btn => btn.textContent?.includes('Short Scrimmage'));
        if (profileButtons.length > 0) {
            fireEvent.click(profileButtons[0]);
        }
 
        fireEvent.click(await screen.findByText('matchSetup.startMatch'));

        expect(mockOnStartMatch).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Test Home' }),
            expect.objectContaining({ name: 'Test Away' }),
            expect.objectContaining({ id: 'training_short' }),
            undefined
        );
    });

    it('allows changing team colors', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const colorInputs = await screen.findAllByTitle(/matchSetup\.primaryColorTitle/i);
        expect(colorInputs.length).toBe(2);

        fireEvent.change(colorInputs[0], { target: { value: '#00ff00' } });
        expect(colorInputs[0]).toHaveValue('#00ff00');
    });

    it('displays gender mix for starters', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
        const genderBadges = await screen.findAllByText(/\d+ M/);
        expect(genderBadges.length).toBeGreaterThan(0);
    });

    it('allows updating player number', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const numberInputs = await screen.findAllByPlaceholderText('#');
        const firstNumberInput = numberInputs[0];

        fireEvent.change(firstNumberInput, { target: { value: '99' } });
        expect(firstNumberInput).toHaveValue(99);
    });

    it('allows updating player name', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const nameInputs = await screen.findAllByPlaceholderText('matchSetup.placeholderName');
        const firstNameInput = nameInputs[0];

        fireEvent.change(firstNameInput, { target: { value: 'John Doe' } });
        expect(firstNameInput).toHaveValue('John Doe');
    });

    it('prepares teams with onField status for starters', async () => {
        render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);

        const startButton = await screen.findByRole('button', { name: /matchSetup\.startMatch/i });
        fireEvent.click(startButton);

        const homeTeam = mockOnStartMatch.mock.calls[0][0];
        const starters = homeTeam.players.filter((p: any) => p.onField);

        // Should have 8 starters on field
        expect(starters.length).toBe(8);
    });

    describe('Team Snapshot Management', () => {
        it('saves a team snapshot', async () => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            
            const saveBtns = await screen.findAllByTitle(/matchSetup\.saveAsClub/i);
            fireEvent.click(saveBtns[0]); // Home team
            
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('matchSetup.teamSaved'));
            const saved = JSON.parse(localStorage.getItem('korfstat_saved_teams') || '[]');
            expect(saved.length).toBe(1);
        });

        it('loads a team snapshot', async () => {
            const savedTeam = {
                id: 'st1',
                name: 'Saved Home Team',
                color: '#123456',
                secondaryColor: '#654321',
                players: [{ id: 'p1', name: 'Saved Player', number: 1, gender: 'M', initialPosition: 'ATTACK', isStarter: true }]
            };
            localStorage.setItem('korfstat_saved_teams', JSON.stringify([savedTeam]));
            
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            
            // Open load menu
            const loadBtns = await screen.findAllByTitle(/matchSetup\.loadSaved/i);
            fireEvent.click(loadBtns[0]);
            
            // Click the saved team
            const teamBtn = await screen.findByText('Saved Home Team');
            fireEvent.click(teamBtn);
            
            expect(await screen.findByDisplayValue('Saved Home Team')).toBeInTheDocument();
            expect(await screen.findByDisplayValue('Saved Player')).toBeInTheDocument();
        });
    });

    describe('Club Integration', () => {
        it('loads colors and players from a club', async () => {
            const mockClub = {
                id: 'c1',
                name: 'Pro Club',
                primaryColor: '#aabbcc',
                secondaryColor: '#ddeeff',
                logoUrl: 'logo.png',
                players: [{ id: 'cp1', firstName: 'Club', lastName: 'Player', shirtNumber: 7, gender: 'M', positions: ['ATTACK'] }]
            };
            vi.mocked(ClubService.getAllClubs).mockReturnValue([mockClub] as any);
            
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            
            // Open club menu
            const clubBtns = await screen.findAllByTitle(/matchSetup\.loadClub/i);
            fireEvent.click(clubBtns[0]);
            
            // Click the club
            const clubBtn = await screen.findByText('Pro Club');
            fireEvent.click(clubBtn);
            
            expect(await screen.findByDisplayValue('Pro Club')).toBeInTheDocument();
            expect(await screen.findByDisplayValue('Club Player')).toBeInTheDocument();
        });
    });

    describe('Template Management', () => {
        it('saves a match template', async () => {
            render(<MatchSetup onStartMatch={mockOnStartMatch} onNavigate={mockOnNavigate} savedMatches={mockSavedMatches} />);
            
            const templateNameInput = await screen.findByPlaceholderText('matchSetup.templateName');
            fireEvent.change(templateNameInput, { target: { value: 'Finals Template' } });
            
            const saveBtn = await screen.findByText('common.save');
            fireEvent.click(saveBtn);
            
            await waitFor(() => {
                expect(TemplateService.saveTemplate).toHaveBeenCalledWith(expect.objectContaining({
                    name: 'Finals Template'
                }));
            });
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
            const loadBtn = await screen.findByRole('button', { name: /matchSetup\.loadTemplate/i });
            fireEvent.click(loadBtn);
            
            // Wait for templates to load and click
            const templateBtn = await screen.findByText('Load Me');
            fireEvent.click(templateBtn);
            
            expect(await screen.findByDisplayValue('Template Home')).toBeInTheDocument();
            expect(await screen.findByDisplayValue('Template Away')).toBeInTheDocument();
        });
    });
});
