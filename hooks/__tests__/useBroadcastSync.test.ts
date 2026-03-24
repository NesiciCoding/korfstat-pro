import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBroadcastSync } from '../useBroadcastSync';
import { MatchState } from '../../types';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

// Mock fetch
global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
}));

// Mock BroadcastChannel for jsdom
class MockBroadcastChannel {
    name: string;
    onmessage: ((ev: MessageEvent) => any) | null = null;
    constructor(name: string) { this.name = name; }
    postMessage(message: any) { }
    close() { }
}
global.BroadcastChannel = MockBroadcastChannel as any;

// Mock Settings Context
vi.mock('../../contexts/SettingsContext', () => ({
    useSettings: () => ({
        settings: {
            watchControlMode: 'read-only'
        }
    })
}));

describe('useBroadcastSync', () => {
    let mockSocket: Partial<Socket>;
    let eventHandlers: Record<string, Function>;

    beforeEach(() => {
        eventHandlers = {};

        mockSocket = {
            on: vi.fn((event: string, handler: Function) => {
                eventHandlers[event] = handler;
                return mockSocket as Socket; // Return socket for chaining
            }),
            emit: vi.fn(),
            disconnect: vi.fn(),
            connected: true,
        };

        (io as any).mockReturnValue(mockSocket);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createMockMatchState = (): MatchState => ({
        id: 'test-match',
        isConfigured: true,
        halfDurationSeconds: 1500,
        homeTeam: { id: 'HOME', name: 'Home', players: [], color: '', substitutionCount: 0 },
        awayTeam: { id: 'AWAY', name: 'Away', players: [], color: '', substitutionCount: 0 },
        events: [],
        currentHalf: 1,
        possession: null,
        timer: { elapsedSeconds: 0, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
    });

    const renderAndWaitForSocket = async (matchId: string, state: MatchState, onUpdate: any, onSpotter?: any) => {
        const result = renderHook(() => useBroadcastSync(matchId, state, onUpdate, onSpotter));
        await waitFor(() => {
            expect(io).toHaveBeenCalled();
            expect(eventHandlers['connect']).toBeDefined();
        });
        return result;
    };

    it('should connect to websocket server on mount', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        await renderAndWaitForSocket('test-match', matchState, onUpdate);

        expect(io).toHaveBeenCalledWith(expect.stringContaining(':3002'));
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('match-update', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('active-sessions', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('spotter-action', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should disconnect on unmount', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { unmount } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        unmount();

        await waitFor(() => {
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });
    });

    it('should call onUpdate when receiving match-update event', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();
        const newMatchState = { ...matchState, currentHalf: 2 };

        await renderAndWaitForSocket('test-match', matchState, onUpdate);

        act(() => {
            eventHandlers['match-update'](newMatchState);
        });

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith(newMatchState);
        });
    });

    it('should broadcast updates via socket', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        const updatedState = { ...matchState, currentHalf: 2 };

        act(() => {
            result.current.broadcastUpdate(updatedState);
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('match-update', { ...updatedState, id: 'test-match' });
    });

    it('should not broadcast identical states', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        await waitFor(() => {
            expect(result.current.socket).not.toBeNull();
        }, { timeout: 2000 });

        act(() => {
            result.current.broadcastUpdate(matchState);
            result.current.broadcastUpdate(matchState); 
        });

        expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });

    it('should provide debounced broadcast function', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        expect(result.current.broadcastUpdateDebounced).toBeDefined();
        expect(typeof result.current.broadcastUpdateDebounced).toBe('function');
    });

    it('should register view with socket', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        act(() => {
            result.current.registerView('TRACK');
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('register-view', 'TRACK');
    });

    it('should update active sessions when receiving active-sessions event', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        const sessions = [{ id: '1', view: 'TRACK' }, { id: '2', view: 'STATS' }];

        act(() => {
            eventHandlers['active-sessions'](sessions);
        });

        expect(result.current.activeSessions).toEqual([
            ...sessions,
            expect.objectContaining({
                id: 'wear-os-adb',
                view: 'WATCH',
                ip: 'ADB Bridge',
                userAgent: 'Wear OS Emulator (read-only)'
            })
        ]);
    });

    it('should call onSpotterAction when receiving spotter-action event', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();
        const onSpotterAction = vi.fn();

        await renderAndWaitForSocket('test-match', matchState, onUpdate, onSpotterAction);

        const spotterAction = { type: 'GOAL', teamId: 'HOME' };

        act(() => {
            eventHandlers['spotter-action'](spotterAction);
        });

        expect(onSpotterAction).toHaveBeenCalledWith(spotterAction);
    });

    it('should prevent echo loops by not updating on own broadcasts', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = await renderAndWaitForSocket('test-match', matchState, onUpdate);

        const updatedState = { ...matchState, currentHalf: 2 };

        act(() => {
            result.current.broadcastUpdate(updatedState);
        });

        act(() => {
            eventHandlers['match-update'](updatedState);
        });

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledTimes(0);
        });
    });
});
