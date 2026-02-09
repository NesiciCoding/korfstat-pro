import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MatchState } from '../types';

export const useBroadcastSync = (
    currentState: MatchState,
    onUpdate: (newState: MatchState) => void
) => {
    const socketRef = useRef<Socket | null>(null);
    const lastBroadcastStateStr = useRef<string>('');
    const lastReceivedStateStr = useRef<string>('');
    const isProcessingUpdate = useRef(false);

    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    // Initialize Socket Once
    useEffect(() => {
        // Connect to WebSocket Server
        // Use hostname to support mobile devices on same network
        const host = window.location.hostname;
        const socket = io(`http://${host}:3001`);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Sync] Connected to WebSocket Server');
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
            onUpdate(newState);

            // Reset flag after a tick to allow local changes again
            setTimeout(() => {
                isProcessingUpdate.current = false;
            }, 50);
        });

        // Listen for active sessions update
        socket.on('active-sessions', (sessions: any[]) => {
            setActiveSessions(sessions);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [onUpdate]);

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

    const registerView = useCallback((viewName: string) => {
        if (socketRef.current) {
            socketRef.current.emit('register-view', viewName);
        }
    }, []);

    return { broadcastUpdate, activeSessions, registerView };
}; // End of file
