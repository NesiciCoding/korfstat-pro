import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchTracker from '../MatchTracker';
import { MatchState } from '../../types';

// Mock dependencies
vi.mock('../../contexts/SettingsContext', () => ({
    useSettings: () => ({
        settings: { soundEnabled: true },
        updateSettings: vi.fn()
    })
}));

vi.mock('../../hooks/useGameAudio', () => ({
    useGameAudio: () => ({
        playShotClockBuzzer: vi.fn(),
        playGameEndHorn: vi.fn()
    })
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
    useKeyboardShortcuts: vi.fn()
}));

vi.mock('../../hooks/useVoiceCommands', () => ({
    useVoiceCommands: () => ({
        isListening: false,
        toggleListening: vi.fn(),
        transcript: '',
        lastCommand: null
    })
}));

vi.mock('socket.io-client', () => ({
    io: () => ({
        on: vi.fn(),
        off: vi.fn(),
        disconnect: vi.fn()
    })
}));

// Mock KorfballField to avoid canvas/complex rendering in jsdom
vi.mock('../KorfballField', () => ({
    default: () => <div data-testid="korfball-field">Field</div>,
    getShotDistanceType: () => 'MEDIUM'
}));

describe('MatchTracker', () => {
    const mockUpdateMatch = vi.fn();
    const mockFinishMatch = vi.fn();

    const baseState: MatchState = {
        id: 'test',
        isConfigured: true,
        halfDurationSeconds: 1500,
        homeTeam: { id: 'HOME', name: 'Home Team', players: [], color: '#ff0000', substitutionCount: 0 },
        awayTeam: { id: 'AWAY', name: 'Away Team', players: [], color: '#0000ff', substitutionCount: 0 },
        events: [],
        currentHalf: 1,
        possession: 'HOME',
        timer: { elapsedSeconds: 0, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders team names and scores', () => {
        render(
            <MatchTracker
                matchState={baseState}
                onUpdateMatch={mockUpdateMatch}
                onFinishMatch={mockFinishMatch}
            />
        );

        expect(screen.getAllByText('Home Team')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Away Team')[0]).toBeInTheDocument();
        // Scores are 0 initially
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    it('displays correct time', () => {
        render(
            <MatchTracker
                matchState={baseState}
                onUpdateMatch={mockUpdateMatch}
                onFinishMatch={mockFinishMatch}
            />
        );
        // 1500 seconds = 25:00
        expect(screen.getByText('25:00')).toBeInTheDocument();
    });
});
