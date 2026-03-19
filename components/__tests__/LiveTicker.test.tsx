import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import LiveTicker from '../LiveTicker';

// Mock socket.io-client
const mockSocket = {
    on: vi.fn(),
    disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => mockSocket),
}));

// Mock fetch
global.fetch = vi.fn();

describe('LiveTicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            json: () => Promise.resolve({
                matchId: 'test-match',
                status: 'LIVE',
                clock: { period: 1, timerRunning: true, timeRemaining: 600, currentMinute: 15 },
                score: { home: 10, away: 8, homeTeam: 'Home Team', awayTeam: 'Away Team', homeColor: 'blue', awayColor: 'red' },
                lastEvent: { type: 'GOAL', description: 'Home Team score!', timestamp: Date.now() }
            }),
        });
    });

    it('renders loading state initially', async () => {
    render(<LiveTicker />);
    expect(screen.getByText(/Connecting to Match.../i)).toBeInTheDocument();
    // Wait for loading to finish to avoid act warning
    await waitFor(() => expect(screen.queryByText(/Connecting to Match.../i)).not.toBeInTheDocument());
    // Wait for data to load to avoid act warning
    await screen.findByText('Home Team');
    });

    it('renders match data after successful fetch', async () => {
        render(<LiveTicker />);
        
        expect(await screen.findByText('Home Team')).toBeInTheDocument();
        expect(await screen.findByText('Away Team')).toBeInTheDocument();
        expect(await screen.findByText('10')).toBeInTheDocument();
        expect(await screen.findByText('8')).toBeInTheDocument();
        expect(await screen.findByText("15'")).toBeInTheDocument();
    });

    it('displays the last event description', async () => {
        render(<LiveTicker />);
        
        expect(await screen.findByText(/Home Team score!/i)).toBeInTheDocument();
        expect(await screen.findByText('[GOAL]')).toBeInTheDocument();
    });

    it('updates when socket emits ticker-update', async () => {
        let updateCallback: any;
        mockSocket.on.mockImplementation((event, cb) => {
            if (event === 'ticker-update') updateCallback = cb;
        });

        render(<LiveTicker />);

        expect(await screen.findByText('Home Team')).toBeInTheDocument();

        // Simulate socket update
        const updatedData = {
            matchId: 'test-match',
            status: 'LIVE',
            clock: { period: 1, timerRunning: true, timeRemaining: 540, currentMinute: 16 },
            score: { home: 11, away: 8, homeTeam: 'Home Team', awayTeam: 'Away Team', homeColor: 'blue', awayColor: 'red' },
            lastEvent: { type: 'GOAL', description: 'Another goal!', timestamp: Date.now() }
        };

        act(() => {
            updateCallback(updatedData);
        });

        expect(await screen.findByText('11')).toBeInTheDocument();
        expect(await screen.findByText("16'")).toBeInTheDocument();
        expect(await screen.findByText(/Another goal!/i)).toBeInTheDocument();
    });

    it('shows offline state when no data and socket disconnected', async () => {
        (global.fetch as any).mockRejectedValue(new Error('API Down'));
        
        let disconnectCallback: any;
        mockSocket.on.mockImplementation((event, cb) => {
            if (event === 'connect') cb();
            if (event === 'disconnect') disconnectCallback = cb;
        });

        render(<LiveTicker />);
        
        act(() => {
            disconnectCallback();
        });

        expect(await screen.findByText(/No Active Match Found/i)).toBeInTheDocument();
    });
});
