import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, renderWithProviders } from '../../test/test-utils';
import SeasonManager from '../SeasonManager';

// i18next mock is handled globally in test/setup.ts

// Mock subcomponents
vi.mock('../TournamentBracket', () => ({
    default: () => <div data-testid="tournament-bracket">Mock Bracket</div>
}));

vi.mock('../GroupStage', () => ({
    default: () => <div data-testid="group-stage">Mock Group Stage</div>
}));

// Mock utils
vi.mock('../../utils/tournamentLogic', () => ({
    generateEmptyBracket: vi.fn(() => []),
    updateBracketProgression: vi.fn((nodes) => nodes)
}));

vi.mock('../../services/bracketExport', () => ({
    exportBracketToPDF: vi.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
    value: { randomUUID: () => 'test-uuid' }
});

describe('SeasonManager', () => {
    const mockMatches = [
        {
            id: 'm1',
            seasonId: 's1',
            homeTeam: { id: 't1', name: 'Home Team' },
            awayTeam: { id: 't2', name: 'Away Team' },
            events: [
                { type: 'SHOT', result: 'GOAL', teamId: 'HOME', playerId: 'p1' },
                { type: 'SHOT', result: 'GOAL', teamId: 'AWAY', playerId: 'p2' }
            ]
        }
    ] as any;

    const mockSeasons = [
        {
            id: 's1',
            name: 'Season 2024',
            format: 'LEAGUE',
            startDate: Date.now(),
            teams: [],
            matches: [],
            standings: [],
            bracketMap: {}
        }
    ];

    const mockOnBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSeasons));
    });

    it('renders season list', () => {
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        expect(screen.getByText('season.title')).toBeTruthy();
        expect(screen.getByText('Season 2024')).toBeTruthy();
        expect(screen.getByText('season.createSeason')).toBeTruthy();
    });

    it('toggles creation form', () => {
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        fireEvent.click(screen.getByText('season.createSeason'));
        expect(screen.getByPlaceholderText('season.seasonPlaceholder')).toBeTruthy();
        expect(screen.getByRole('button', { name: /season.create/i })).toBeTruthy();
    });

    it('creates a new season', () => {
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        fireEvent.click(screen.getByText('season.createSeason'));
        
        const input = screen.getByPlaceholderText('season.seasonPlaceholder');
        fireEvent.change(input, { target: { value: 'New Test Season' } });
        
        fireEvent.click(screen.getByRole('button', { name: /season.create/i }));
        
        expect(localStorageMock.setItem).toHaveBeenCalledWith('korfstat_seasons', expect.stringContaining('New Test Season'));
        expect(screen.getByText('New Test Season')).toBeTruthy();
    });

    it('opens active season view', () => {
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        fireEvent.click(screen.getByText('Season 2024'));
        
        expect(screen.getByText('season.breadcrumb')).toBeTruthy();
        expect(screen.getByText('Season 2024', { selector: 'span' })).toBeTruthy();
        expect(screen.getByText('season.leagueTable')).toBeTruthy();
        expect(screen.getByText('Home Team')).toBeTruthy();
        expect(screen.getByText('Away Team')).toBeTruthy();
    });

    it('switches between format specific views', () => {
        const knockoutSeason = [
            {
                id: 's2',
                name: 'Cup 2024',
                format: 'KNOCKOUT',
                startDate: Date.now(),
                bracketConfig: { teamCount: 4, thirdPlaceMatch: true }
            }
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(knockoutSeason));
        
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        fireEvent.click(screen.getByText('Cup 2024'));
        
        expect(screen.getByTestId('tournament-bracket')).toBeTruthy();
    });

    it('handles group knockout format', () => {
        const groupSeason = [
            {
                id: 's3',
                name: 'Group Cup',
                format: 'GROUP_KNOCKOUT',
                startDate: Date.now(),
                groups: [{ id: 'GA', name: 'Group A', teamIds: [] }]
            }
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(groupSeason));
        
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        fireEvent.click(screen.getByText('Group Cup'));
        
        expect(screen.getByTestId('group-stage')).toBeTruthy();
        expect(screen.getByTestId('tournament-bracket')).toBeTruthy();
    });
    
    it('back from active season to list', () => {
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        fireEvent.click(screen.getByText('Season 2024'));
        
        fireEvent.click(screen.getByText('season.breadcrumb'));
        expect(screen.queryByText('season.leagueTable')).toBeNull();
        expect(screen.getByText('Season 2024')).toBeTruthy();
    });

    it('calls onBack prop when main back button is clicked', () => {
        renderWithProviders(<SeasonManager onBack={mockOnBack} matches={mockMatches} />);
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]); // first button is back arrow
        expect(mockOnBack).toHaveBeenCalled();
    });
});
