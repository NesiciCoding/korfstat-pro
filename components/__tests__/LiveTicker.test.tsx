import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

    it('renders connecting state initially', () => {
        render(<LiveTicker />);
        expect(screen.getByText(/Connecting to Match.../i)).toBeInTheDocument();
    });

    it('renders match data after successful fetch', async () => {
        render(<LiveTicker />);
        
        await waitFor(() => {
            expect(screen.getByText('Home Team')).toBeInTheDocument();
            expect(screen.getByText('Away Team')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('8')).toBeInTheDocument();
            expect(screen.getByText("15'")).toBeInTheDocument();
        });
    });

    it('displays the last event description', async () => {
        render(<LiveTicker />);
        
        await waitFor(() => {
            expect(screen.getByText(/Home Team score!/i)).toBeInTheDocument();
            expect(screen.getByText('[GOAL]')).toBeInTheDocument();
        });
    });

    it('updates when socket emits ticker-update', async () => {
        let updateCallback: any;
        mockSocket.on.mockImplementation((event, cb) => {
            if (event === 'ticker-update') updateCallback = cb;
        });

        render(<LiveTicker />);

        await waitFor(() => expect(screen.getByText('Home Team')).toBeInTheDocument());

        // Simulate socket update
        const updatedData = {
            matchId: 'test-match',
            status: 'LIVE',
            clock: { period: 1, timerRunning: true, timeRemaining: 540, currentMinute: 16 },
            score: { home: 11, away: 8, homeTeam: 'Home Team', awayTeam: 'Away Team', homeColor: 'blue', awayColor: 'red' },
            lastEvent: { type: 'GOAL', description: 'Another goal!', timestamp: Date.now() }
        };

        updateCallback(updatedData);

        await waitFor(() => {
            expect(screen.getByText('11')).toBeInTheDocument();
            expect(screen.getByText("16'")).toBeInTheDocument();
            expect(screen.getByText(/Another goal!/i)).toBeInTheDocument();
        });
    });

    it('shows offline state when no data and socket disconnected', async () => {
        (global.fetch as any).mockRejectedValue(new Error('API Down'));
        
        // Trigger disconnect
        let disconnectCallback: any;
        mockSocket.on.mockImplementation((event, cb) => {
            if (event === 'disconnect') disconnectCallback = cb;
        });

        render(<LiveTicker />);
        
        // Wait for connect event first to set status to LIVE (simulated)
        let connectCallback: any;
        mockSocket.on.mockImplementation((event, cb) => {
            if (event === 'connect') cb();
            if (event === 'disconnect') disconnectCallback = cb;
        });

        disconnectCallback();

        await waitFor(() => {
            expect(screen.getByText(/No Active Match Found/i)).toBeInTheDocument();
        });
    });
});
