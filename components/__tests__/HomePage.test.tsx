import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import HomePage from '../HomePage';
import { MatchState } from '../../types';
import { SettingsProvider } from '../../contexts/SettingsContext';

const render = (ui: React.ReactElement, options = {}) =>
    rtlRender(ui, { wrapper: SettingsProvider, ...options });

describe('HomePage', () => {
    const mockNavigate = vi.fn();
    const mockActiveSessions: any[] = [{ id: '1', view: 'JURY' }, { id: '2', view: 'STATS' }, { id: '3', view: 'LIVE' }];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock fetch for active matches and setup info
        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/matches/active')) {
                return Promise.resolve({
                    json: () => Promise.resolve([])
                });
            }
            if (url.includes('/api/companion/setup-info')) {
                return Promise.resolve({
                    json: () => Promise.resolve({ localIp: '192.168.1.10' })
                });
            }
            return Promise.reject(new Error('Unknown fetch URL'));
        });
    });

    const createMockMatchState = (isConfigured: boolean): MatchState => ({
        id: 'test-match-123',
        isConfigured,
        halfDurationSeconds: 1800,
        homeTeam: {
            id: 'HOME',
            name: 'Home Blazers',
            players: [{ id: '1', name: 'Player 1', number: 10, gender: 'M', initialPosition: 'ATTACK', isStarter: true }],
            color: '#ff0000',
            substitutionCount: 0
        },
        awayTeam: {
            id: 'AWAY',
            name: 'Away Stars',
            players: [{ id: '2', name: 'Player 2', number: 20, gender: 'F', initialPosition: 'DEFENSE', isStarter: true }],
            color: '#0000ff',
            substitutionCount: 0
        },
        events: [],
        currentHalf: 1,
        possession: 'HOME',
        timer: { elapsedSeconds: 120, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
    });

    it('renders welcome message and title', async () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(await screen.findByText('KorfStat Pro')).toBeInTheDocument();
        expect(screen.getByText('home.commandCenter')).toBeInTheDocument();
    });

    it('displays active sessions count', async () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(await screen.findByTestId('active-sessions-count')).toHaveTextContent('3');
        expect(screen.getByText('home.activeSessions')).toBeInTheDocument();
    });

    it('navigates to Match Setup when "Start New Match" is clicked', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        const newMatchButton = screen.getByText('home.startNewMatch');
        fireEvent.click(newMatchButton);

        expect(mockNavigate).toHaveBeenCalledWith('SETUP');
    });

    it('navigates to Match History when history card is clicked', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        // Navigation cards are now widgets with dynamic titles or translation keys
        const historyCard = screen.getByRole('heading', { name: /views\.match_history/i });
        fireEvent.click(historyCard);

        expect(mockNavigate).toHaveBeenCalledWith('MATCH_HISTORY');
    });

    it('shows "Resume Tracker" button when match is in progress', () => {
        const activeMatch = createMockMatchState(true);

        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={activeMatch}
            />
        );

        expect(screen.getByText('home.resumeTracker')).toBeInTheDocument();
        // Team names are not displayed on HomePage, only match status
        // expect(screen.getByText(/Home Blazers/i)).toBeInTheDocument();
        // expect(screen.getByText(/Away Stars/i)).toBeInTheDocument();
    });

    it('navigates to tracker when "Resume Tracker" is clicked', () => {
        const activeMatch = createMockMatchState(true);

        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={activeMatch}
            />
        );

        const continueButton = screen.getByText(/home\.resumeTracker/);
        fireEvent.click(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith('TRACK');
    });

    it('displays match in progress information', () => {
        const activeMatch = createMockMatchState(true);

        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={activeMatch}
            />
        );

        // Check that teams are displayed
        // Team names are not displayed on HomePage
        // expect(screen.getByText('Home Blazers')).toBeInTheDocument();
        // expect(screen.getByText('Away Stars')).toBeInTheDocument();

        // Check match active indicator
        expect(screen.getByText('home.matchActive')).toBeInTheDocument();
    });

    it('does not show "Resume Tracker" when no active match', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(screen.queryByText('home.resumeTracker')).not.toBeInTheDocument();
    });

    it('shows all navigation cards', async () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        // Check for main feature cards by translation keys in headings
        expect(await screen.findByText('home.startNewMatch')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /views\.match_history/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /views\.overall_stats/i })).toBeInTheDocument();
    });
});
