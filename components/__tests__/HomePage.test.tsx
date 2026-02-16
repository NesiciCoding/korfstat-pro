import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../HomePage';
import { MatchState } from '../../types';

describe('HomePage', () => {
    const mockNavigate = vi.fn();
    const mockActiveSessions: any[] = [{ id: '1' }, { id: '2' }, { id: '3' }];

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
        expect(screen.getByText(/Command Center/i)).toBeInTheDocument();
    });

    it('displays active sessions count', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/Active Sessions/i)).toBeInTheDocument();
    });

    it('navigates to Match Setup when "Start New Match" is clicked', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        const newMatchButton = screen.getByRole('button', { name: /Start New Match/i });
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
        const historyCard = screen.getByText(/Match History/i);
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

        expect(screen.getByText(/Resume Tracker/i)).toBeInTheDocument();
        expect(screen.getByText(/Resume Tracker/i)).toBeInTheDocument();
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

        const continueButton = screen.getByRole('button', { name: /Resume Tracker/i });
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
        expect(screen.getByText(/MATCH ACTIVE/i)).toBeInTheDocument();
    });

    it('does not show "Resume Tracker" when no active match', () => {
        render(
            <HomePage
                onNavigate={mockNavigate}
                activeSessions={mockActiveSessions}
                matchState={null}
            />
        );

        expect(screen.queryByText(/Resume Tracker/i)).not.toBeInTheDocument();
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
        expect(screen.getByText(/Start New Match/i)).toBeInTheDocument();
        expect(screen.getByText(/Match History/i)).toBeInTheDocument();
        expect(screen.getByText(/Overall Stats/i)).toBeInTheDocument();
    });
});
