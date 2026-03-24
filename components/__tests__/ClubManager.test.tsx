import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, renderWithProviders, waitFor } from '../../test/test-utils';
import ClubManager from '../ClubManager';
import { ClubService } from '../../services/clubService';
import { calculateCareerStats } from '../../utils/statsCalculator';

// Mock services and utils
vi.mock('../../services/clubService', () => ({
    ClubService: {
        getAllClubs: vi.fn(),
        saveClub: vi.fn(),
        deleteClub: vi.fn(),
        migrateLegacyTeams: vi.fn()
    }
}));

vi.mock('../../utils/statsCalculator', () => ({
    calculateCareerStats: vi.fn()
}));

// Mock ClubEditor component
vi.mock('../ClubEditor', () => ({
    default: ({ club, onBack }: any) => (
        <div data-testid="club-editor">
            <span>Editor for {club.name}</span>
            <button onClick={onBack}>Back from Editor</button>
        </div>
    )
}));

// Mock confirm and alert
const mockConfirm = vi.fn();
const mockAlert = vi.fn();
window.confirm = mockConfirm;
window.alert = mockAlert;

describe('ClubManager', () => {
    const mockClubs = [
        {
            id: '1',
            name: 'Club One',
            shortName: 'C1',
            primaryColor: '#ff0000',
            players: [{ id: 'p1', firstName: 'John', lastName: 'Doe', gender: 'OTHER', active: true, positions: ['ATTACK'] }],
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
    ];

    const mockOnBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ClubService.getAllClubs).mockReturnValue(mockClubs as any);
        vi.mocked(calculateCareerStats).mockReturnValue({ goals: 5, yellowCards: 0, redCards: 0, fouls: 1, rebounds: 10, penaltyGiven: 0, penaltyReceived: 0, turnovers: 3 } as any);
    });

    it('renders club list and create card', () => {
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        expect(screen.getByText('clubManager.title')).toBeTruthy();
        expect(screen.getByText('Club One')).toBeTruthy();
        expect(screen.getByText('clubManager.createNew')).toBeTruthy();
    });

    it('calls onBack when back button is clicked', () => {
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        const backBtn = screen.getByTestId('back-button');
        fireEvent.click(backBtn);
        expect(mockOnBack).toHaveBeenCalled();
    });

    it('handles club creation', () => {
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        fireEvent.click(screen.getByText('clubManager.createNew'));
        expect(ClubService.saveClub).toHaveBeenCalled();
        // It should also open the editor for the new club
        expect(screen.getByTestId('club-editor')).toBeTruthy();
    });

    it('opens editor when a club is clicked', () => {
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        fireEvent.click(screen.getByText('Club One'));
        expect(screen.getByTestId('club-editor')).toBeTruthy();
        expect(screen.getByText('Editor for Club One')).toBeTruthy();
    });

    it('handles club deletion after confirmation', async () => {
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        
        const deleteBtn = screen.getByTestId('delete-club-1');
        fireEvent.click(deleteBtn);
        
        // Find and click the confirm button in the dialog
        const confirmBtn = await screen.findByText('common.confirm');
        fireEvent.click(confirmBtn);
        
        await waitFor(() => {
            expect(ClubService.deleteClub).toHaveBeenCalledWith('1');
        });
    });

    it('does not delete club if not confirmed', async () => {
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        
        const deleteBtn = screen.getByTestId('delete-club-1');
        fireEvent.click(deleteBtn);
        
        // Find and click the cancel button in the dialog
        const cancelBtn = await screen.findByText('common.cancel');
        fireEvent.click(cancelBtn);
        
        expect(ClubService.deleteClub).not.toHaveBeenCalled();
    });

    it('handles legacy migration', async () => {
        vi.mocked(ClubService.migrateLegacyTeams).mockReturnValue(5);
        renderWithProviders(<ClubManager onBack={mockOnBack} />);
        
        fireEvent.click(screen.getByText('clubManager.importLegacy'));
        expect(ClubService.migrateLegacyTeams).toHaveBeenCalled();
        expect(await screen.findByText('clubManager.migrated')).toBeInTheDocument();
    });

    it('shows stats if savedMatches are provided', () => {
        const mockMatches = [{ id: 'm1', events: [] }] as any;
        renderWithProviders(<ClubManager onBack={mockOnBack} savedMatches={mockMatches} />);
        expect(screen.getByText('clubManager.statsAvailable')).toBeTruthy();
        expect(screen.getByText('clubManager.topScorers')).toBeTruthy();
        expect(screen.getByText('John Doe')).toBeTruthy();
    });
});
