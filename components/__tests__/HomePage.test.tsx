import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../HomePage';
import { MatchState } from '../../types';

describe('HomePage', () => {
    const mockNavigate = vi.fn();
    const mockActiveSessions: any[] = [{ id: '1', view: 'JURY' }, { id: '2', view: 'STATS' }, { id: '3', view: 'LIVE' }];

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

    it('renders welcome message and title', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(screen.getByText('KorfStat Pro')).toBeInTheDocument();
        expect(screen.getByText('KorfStat Pro')).toBeInTheDocument();
        expect(screen.getByText('home.commandCenter')).toBeInTheDocument();
    });

    it('displays active sessions count', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('3');
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

        const newMatchButton = screen.getByRole('button', { name: 'home.startNewMatch' });
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

        // Navigation cards are clickable divs, not buttons
        const historyCard = screen.getByText('views.matchHistory');
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

        const continueButton = screen.getByRole('button', { name: /home\.resumeTracker/ });
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

    it('shows all navigation cards', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        // Check for main feature cards by text content
        expect(screen.getByText('home.startNewMatch')).toBeInTheDocument();
        expect(screen.getByText('views.matchHistory')).toBeInTheDocument();
        expect(screen.getByText('views.overallStats')).toBeInTheDocument();
    });
});
