import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SpotterView from '../SpotterView';
import { MatchState, Player } from '../../types';
import { io } from 'socket.io-client';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
    const mSocket = {
        emit: vi.fn(),
        off: vi.fn(),
        on: vi.fn(),
    };
    return { io: vi.fn(() => mSocket) };
});

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

// Mock hooks
vi.mock('../../hooks/useVoiceCommands', () => {
    let internalOnCommand: any;
    return {
        useVoiceCommands: vi.fn(({ onCommand }: any) => {
            internalOnCommand = onCommand;
            return {
                isListening: false,
                toggleListening: vi.fn(),
                transcript: '',
                lastCommand: null
            };
        }),
        // Add a helper to trigger the command from outside
        __triggerCommand: (action: any) => internalOnCommand?.(action)
    };
});

describe('SpotterView', () => {
    const mockMatchState: MatchState = {
        id: 'test-match',
        isConfigured: true,
        currentHalf: 1,
        halfDurationSeconds: 1500,
        homeTeam: { id: 'HOME', name: 'PHome', players: [], color: '#ff0000', substitutionCount: 8 },
        awayTeam: { id: 'AWAY', name: 'PAway', players: [], color: '#0000ff', substitutionCount: 0 },
        events: [],
        possession: 'HOME',
        timer: { elapsedSeconds: 0, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
    };

    const mockSocket = io();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('registers as a spotter on mount', () => {
        render(<SpotterView matchState={mockMatchState} onBack={() => {}} />);
        expect(mockSocket.emit).toHaveBeenCalledWith('register-view', 'SPOTTER');
    });

    it('emits spotter-action when a manual button is clicked', () => {
        render(<SpotterView matchState={mockMatchState} onBack={() => {}} />);
        
        const goalButtons = screen.getAllByText('matchTracker.goal');
        fireEvent.click(goalButtons[0]); // Home Goal

        expect(mockSocket.emit).toHaveBeenCalledWith('spotter-action', expect.objectContaining({
            type: 'GOAL',
            teamId: 'HOME'
        }));
    });

    it('shows feedback after an action', async () => {
        render(<SpotterView matchState={mockMatchState} onBack={() => {}} />);
        
        fireEvent.click(screen.getAllByText('matchTracker.goal')[0]);
        
        expect(screen.getByText(/commandRegistered/)).toBeInTheDocument();
    });

    it('toggles voice help visibility', async () => {
        render(<SpotterView matchState={mockMatchState} onBack={() => {}} />);
        
        const infoButton = screen.getByTestId('voice-help-button');
        fireEvent.click(infoButton);
        
        expect(await screen.findByText('spotter.helpText')).toBeInTheDocument();
        
        fireEvent.click(infoButton);
        expect(screen.queryByText('spotter.helpText')).not.toBeInTheDocument();
    });

    it('processes simulated voice commands', async () => {
        render(<SpotterView matchState={mockMatchState} onBack={() => {}} />);
        
        const homeTeamWithPlayer = {
            ...mockMatchState.homeTeam,
            players: [{ id: 'P5', number: 5, name: 'Player 5', gender: 'M', initialPosition: 'ATTACK', isStarter: true } as Player]
        };
        const stateWithPlayer = { ...mockMatchState, homeTeam: homeTeamWithPlayer };
        
        render(<SpotterView matchState={stateWithPlayer} onBack={() => {}} />);
        
        // Simulate voice command via the helper
        const { __triggerCommand } = await import('../../hooks/useVoiceCommands') as any;
        act(() => {
            __triggerCommand({ type: 'GOAL', team: 'HOME', playerNumber: 5 });
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('spotter-action', expect.objectContaining({
            type: 'GOAL',
            teamId: 'HOME',
            playerId: 'P5'
        }));
    });
});
