import { useEffect, useState, useRef, useCallback } from 'react';
import { MatchState } from '../types';

const WS_URL = `ws://${window.location.hostname}:3001`;

interface SyncState {
    isConnected: boolean;
    isLocked: boolean;
    lockedBy: string | null;
    serverState: MatchState | null;
    serverHistory: MatchState[];
}

export const useMatchSync = (
    initialState: MatchState,
    initialHistory: MatchState[],
    currentView: string,
    onStateUpdate: (state: MatchState) => void,
    onHistoryUpdate: (history: MatchState[]) => void
) => {
    const [syncStatus, setSyncStatus] = useState<SyncState>({
        isConnected: false,
        isLocked: false,
        lockedBy: null,
        serverState: null,
        serverHistory: []
    });

    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout>();

    // Persist callbacks to avoid reconnection on handler change
    const onStateUpdateRef = useRef(onStateUpdate);
    const onHistoryUpdateRef = useRef(onHistoryUpdate);

    useEffect(() => {
        onStateUpdateRef.current = onStateUpdate;
        onHistoryUpdateRef.current = onHistoryUpdate;
    }, [onStateUpdate, onHistoryUpdate]);

    // 1. Permanent Connection Effect
    useEffect(() => {
        const connect = () => {
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log('Connected to Sync Server');
                setSyncStatus(prev => ({ ...prev, isConnected: true }));
            };

            ws.current.onmessage = (event) => {
                try {
                    const { type, payload } = JSON.parse(event.data);

                    switch (type) {
                        case 'SYNC_STATE':
                            if (payload.matchState) {
                                onStateUpdateRef.current(payload.matchState);
                                setSyncStatus(prev => ({ ...prev, serverState: payload.matchState }));
                            }
                            if (payload.savedMatches) {
                                onHistoryUpdateRef.current(payload.savedMatches);
                            }
                            break;

                        case 'UPDATE_STATE':
                            onStateUpdateRef.current(payload);
                            setSyncStatus(prev => ({ ...prev, serverState: payload }));
                            break;

                        case 'UPDATE_HISTORY':
                            onHistoryUpdateRef.current(payload);
                            break;

                        case 'LOCK_ERROR':
                            setSyncStatus(prev => ({
                                ...prev,
                                isLocked: true,
                                lockedBy: payload.lockedBy
                            }));
                            break;

                        case 'LOCK_SUCCESS':
                            setSyncStatus(prev => ({
                                ...prev,
                                isLocked: false,
                                lockedBy: null
                            }));
                            break;

                        case 'LOCK_UPDATE':
                            // Broadcast gives us new locks, but we rely on explicit success/fail responses
                            // for our own status mostly. However, could double check here if needed.
                            break;
                    }
                } catch (e) {
                    console.error('WS Error:', e);
                }
            };

            ws.current.onclose = () => {
                console.log('Disconnected from Sync Server');
                setSyncStatus(prev => ({ ...prev, isConnected: false }));
                reconnectTimeout.current = setTimeout(connect, 3000);
            };

            ws.current.onerror = (err) => {
                console.error('WS Error:', err);
                ws.current?.close();
            };
        };

        connect();

        return () => {
            ws.current?.close();
            clearTimeout(reconnectTimeout.current);
        };
    }, []); // Empty deps = persist connection

    // 2. View Registration & Locking Effect
    useEffect(() => {
        // Wait for connection
        if (!syncStatus.isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

        // Reset local lock status on view change (optimistic)
        setSyncStatus(prev => ({ ...prev, isLocked: false, lockedBy: null }));

        // Register new view
        ws.current.send(JSON.stringify({
            type: 'REGISTER_VIEW',
            payload: { view: currentView }
        }));

        return () => {
            // Unlock on cleanup (view change or unmount)
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: 'UNLOCK_VIEW',
                    payload: { view: currentView }
                }));
            }
        };
    }, [currentView, syncStatus.isConnected]);

    const sendStateUpdate = (newState: MatchState) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'UPDATE_STATE',
                payload: newState
            }));
        }
    };

    const sendHistoryUpdate = (newHistory: MatchState[]) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'UPDATE_HISTORY',
                payload: newHistory
            }));
        }
    };

    return {
        ...syncStatus,
        sendStateUpdate,
        sendHistoryUpdate
    };
};
