import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MatchState } from '../types';

export const useBroadcastSync = (
    currentState: MatchState,
    onUpdate: (newState: MatchState) => void,
    onSpotterAction?: (action: any) => void
) => {
    const socketRef = useRef<Socket | null>(null);
    const lastBroadcastStateStr = useRef<string>('');
    const lastReceivedStateStr = useRef<string>('');
    const isProcessingUpdate = useRef(false);
    const onUpdateRef = useRef(onUpdate);
    const onSpotterActionRef = useRef<((action: any) => void) | undefined>(onSpotterAction);
    const viewNameRef = useRef<string | null>(null);

    // Keep callback refs fresh
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onSpotterActionRef.current = onSpotterAction;
    });

    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    // Initialize Socket Once
    useEffect(() => {
        // Connect to WebSocket Server
        // Connect to WebSocket Server
        // Use hostname to support mobile devices on same network
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const SOCKET_SERVER_URL = `${protocol}//${hostname}:3002`;

        const socket = io(SOCKET_SERVER_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Sync] Connected to WebSocket Server');
            // Request latest sessions in case we missed an update
            socket.emit('request-active-sessions');

            // Re-register view if we have one (useful for re-connections)
            if (viewNameRef.current) {
                socket.emit('register-view', viewNameRef.current);
            }
        });

        socket.on('match-update', (newState: MatchState) => {
            const newStateStr = JSON.stringify(newState);

            // Prevent echo loops
            if (newStateStr === lastBroadcastStateStr.current) return;
            // Prevent redundant updates
            if (newStateStr === lastReceivedStateStr.current) return;

            console.log('[Sync] Received Update via WebSocket', { eventCount: newState.events.length });

            lastReceivedStateStr.current = newStateStr;
            isProcessingUpdate.current = true;

            // Call the fresh callback
            if (onUpdateRef.current) {
                onUpdateRef.current(newState);
            }

            // Reset flag after a tick to allow local changes again
            setTimeout(() => {
                isProcessingUpdate.current = false;
            }, 50);
        });

        // Listen for active sessions update
        socket.on('active-sessions', (sessions: any[]) => {
            console.log('[Sync] Received Active Sessions:', sessions.length);
            setActiveSessions(sessions);
        });

        // Listen for spotter actions
        socket.on('spotter-action', (action: any) => {
            console.log('[Sync] Received Spotter Action', action);
            if (onSpotterActionRef.current) {
                onSpotterActionRef.current(action);
            }
        });

        socket.on('disconnect', () => {
            console.log('[Sync] Socket Disconnected');
            // Optionally clear active sessions or mark as offline?
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // Empty dependency array = Only connect ONCE on mount

    const broadcastUpdate = useCallback((state: MatchState) => {
        if (!socketRef.current) return;

        // Don't broadcast if we are processing an incoming update (prevent loops)
        if (isProcessingUpdate.current) return;

        const stateStr = JSON.stringify(state);

        // optimizing: only broadcast if changed significantly from last broadcast
        if (stateStr === lastBroadcastStateStr.current) return;
        if (stateStr === lastReceivedStateStr.current) return;

        console.log('[Sync] Broadcasting Update via WebSocket', { eventCount: state.events.length });
        socketRef.current.emit('match-update', state);
        lastBroadcastStateStr.current = stateStr;
    }, []);

    // Debounced version for frequent updates (e.g., clock ticks)
    const debouncedBroadcast = useRef<NodeJS.Timeout | null>(null);
    const broadcastUpdateDebounced = useCallback((state: MatchState, delay: number = 100) => {
        if (debouncedBroadcast.current) {
            clearTimeout(debouncedBroadcast.current);
        }
        debouncedBroadcast.current = setTimeout(() => {
            broadcastUpdate(state);
        }, delay);
    }, [broadcastUpdate]);

    const registerView = useCallback((viewName: string) => {
        viewNameRef.current = viewName;
        if (socketRef.current) {
            socketRef.current.emit('register-view', viewName);
        }
    }, []);


    return { broadcastUpdate, broadcastUpdateDebounced, activeSessions, registerView };
}; // End of file

