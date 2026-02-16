import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBroadcastSync } from '../useBroadcastSync';
import { MatchState } from '../../types';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

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
        };

        (io as any).mockReturnValue(mockSocket);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createMockMatchState = (): MatchState => ({
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

    it('should connect to websocket server on mount', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        renderHook(() => useBroadcastSync(matchState, onUpdate));

        expect(io).toHaveBeenCalledWith(expect.stringContaining(':3002'));
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('match-update', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('active-sessions', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('spotter-action', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should disconnect on unmount', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { unmount } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        unmount();

        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should call onUpdate when receiving match-update event', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();
        const newMatchState = { ...matchState, currentHalf: 2 };

        renderHook(() => useBroadcastSync(matchState, onUpdate));

        // Simulate receiving match update
        act(() => {
            eventHandlers['match-update'](newMatchState);
        });

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith(newMatchState);
        });
    });

    it('should broadcast updates via socket', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        const updatedState = { ...matchState, currentHalf: 2 };

        act(() => {
            result.current.broadcastUpdate(updatedState);
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('match-update', updatedState);
    });

    it('should not broadcast identical states', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        act(() => {
            result.current.broadcastUpdate(matchState);
            result.current.broadcastUpdate(matchState); // Same state again
        });

        // Should only emit once (first call)
        expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });

    it('should provide debounced broadcast function', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        expect(result.current.broadcastUpdateDebounced).toBeDefined();
        expect(typeof result.current.broadcastUpdateDebounced).toBe('function');
    });

    it('should register view with socket', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        act(() => {
            result.current.registerView('TRACK');
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('register-view', 'TRACK');
    });

    it('should update active sessions when receiving active-sessions event', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        const sessions = [{ id: '1', view: 'TRACK' }, { id: '2', view: 'STATS' }];

        act(() => {
            eventHandlers['active-sessions'](sessions);
        });

        expect(result.current.activeSessions).toEqual(sessions);
    });

    it('should call onSpotterAction when receiving spotter-action event', () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();
        const onSpotterAction = vi.fn();

        renderHook(() => useBroadcastSync(matchState, onUpdate, onSpotterAction));

        const spotterAction = { type: 'GOAL', teamId: 'HOME' };

        act(() => {
            eventHandlers['spotter-action'](spotterAction);
        });

        expect(onSpotterAction).toHaveBeenCalledWith(spotterAction);
    });

    it('should prevent echo loops by not updating on own broadcasts', async () => {
        const matchState = createMockMatchState();
        const onUpdate = vi.fn();

        const { result } = renderHook(() => useBroadcastSync(matchState, onUpdate));

        const updatedState = { ...matchState, currentHalf: 2 };

        // Broadcast an update
        act(() => {
            result.current.broadcastUpdate(updatedState);
        });

        // Simulate receiving the same update back
        act(() => {
            eventHandlers['match-update'](updatedState);
        });

        // onUpdate should not be called for echoed broadcasts
        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledTimes(0);
        });
    });
});
