import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { MatchState } from '../types';
import { generateUUID } from '../utils/uuid';
import { useSettings } from '../contexts/SettingsContext';

export const useBroadcastSync = (
    matchId: string | undefined,
    currentState: MatchState,
    onUpdate: (newState: MatchState) => void,
    onSpotterAction?: (action: any) => void,
    onCompanionAction?: (action: any) => void
) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const lastBroadcastStateStr = useRef<string>('');
    const lastReceivedStateStr = useRef<string>('');
    const isProcessingUpdate = useRef(false);
    const onUpdateRef = useRef(onUpdate);
    const onSpotterActionRef = useRef<((action: any) => void) | undefined>(onSpotterAction);
    const onCompanionActionRef = useRef<((action: any) => void) | undefined>(onCompanionAction);
    const viewNameRef = useRef<string | null>(null);

    const { settings } = useSettings();

    // Keep callback refs fresh
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onSpotterActionRef.current = onSpotterAction;
        onCompanionActionRef.current = onCompanionAction;
    });

    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    // BroadcastChannel for true peer-to-peer local cross-tab sync
    const bcRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        bcRef.current = new BroadcastChannel('korfstat_sync');

        bcRef.current.onmessage = (event) => {
            const newState = event.data as MatchState;
            if (matchId && newState.id !== matchId) return;

            const newStateStr = JSON.stringify(newState);
            if (newStateStr === lastBroadcastStateStr.current) return;
            if (newStateStr === lastReceivedStateStr.current) return;

            console.log('[Sync] Received Update via BroadcastChannel');
            lastReceivedStateStr.current = newStateStr;
            isProcessingUpdate.current = true;

            if (onUpdateRef.current) {
                onUpdateRef.current(newState);
            }

            setTimeout(() => {
                isProcessingUpdate.current = false;
            }, 50);
        };

        return () => {
            bcRef.current?.close();
        };
    }, [matchId]);

    // Initialize Socket Once
    useEffect(() => {
        let newSocket: Socket | null = null;
        let isMounted = true;

        const initSocket = async () => {
            let protocol = window.location.protocol;
            let hostname = window.location.hostname;

            // If running in Tauri (or localhost browser), try to resolve Network IP from local backend
            // This ensures cross-device tracking uses the correct IP address instead of failing on tauri://
            if (protocol === 'tauri:' || hostname === 'tauri.localhost' || hostname === 'localhost' || hostname === '127.0.0.1') {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1000);
                    const response = await fetch('http://localhost:3002/api/companion/setup-info', { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const data = await response.json();
                        protocol = 'http:';
                        hostname = data.localIp || 'localhost';
                    } else {
                        protocol = 'http:';
                        hostname = 'localhost';
                    }
                } catch (e) {
                    protocol = 'http:';
                    hostname = 'localhost';
                }
            }

            if (!isMounted) return;

            const SOCKET_SERVER_URL = `${protocol}//${hostname}:3002`;
            newSocket = io(SOCKET_SERVER_URL);
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log(`[Sync] Connected to WebSocket Server at ${SOCKET_SERVER_URL}`);
                newSocket?.emit('request-active-sessions');
                if (viewNameRef.current) {
                    newSocket?.emit('register-view', viewNameRef.current);
                }
                if (matchId) {
                    newSocket?.emit('join-match', matchId);
                    console.log(`[Sync] Joined match room: ${matchId}`);
                }
            });

            newSocket.on('match-update', (newState: MatchState) => {
                const newStateStr = JSON.stringify(newState);
                if (newStateStr === lastBroadcastStateStr.current) return;
                if (newStateStr === lastReceivedStateStr.current) return;

                console.log('[Sync] Received Update via WebSocket');
                lastReceivedStateStr.current = newStateStr;
                isProcessingUpdate.current = true;

                if (onUpdateRef.current) {
                    onUpdateRef.current(newState);
                }

                setTimeout(() => {
                    isProcessingUpdate.current = false;
                }, 50);
            });

            newSocket.on('active-sessions', (sessions: any[]) => {
                setActiveSessions(sessions);
            });

            newSocket.on('disconnect', () => {
                console.log('[Sync] Disconnected from WebSocket Server');
            });

            newSocket.on('spotter-action', (action: any) => {
                if (onSpotterActionRef.current) {
                    onSpotterActionRef.current(action);
                }
            });

            newSocket.on('companion-action', (action: any) => {
                if (onCompanionActionRef.current) {
                    onCompanionActionRef.current(action);
                } else if (onSpotterActionRef.current) {
                    onSpotterActionRef.current(action);
                }
            });

            newSocket.on('watch-action', (payload: { action: string }) => {
                if (onSpotterActionRef.current) {
                    const actionMap: Record<string, string> = {
                        'TOGGLE_GAME_TIME':  'TOGGLE_TIMER',
                        'RESET_SHOT_CLOCK':  'RESET_SHOT_CLOCK',
                    };
                    const mappedAction = actionMap[payload?.action];
                    if (mappedAction) {
                        onSpotterActionRef.current({ action: mappedAction });
                    }
                }
            });
        };

        initSocket();

        return () => {
            isMounted = false;
            if (newSocket) {
                if (matchId) newSocket.emit('leave-match', matchId);
                newSocket.disconnect();
                setSocket(null);
            }
        };
    }, [matchId]);

    const broadcastUpdate = useCallback((state: MatchState) => {
        if (!socket || !socket.connected) return;
        if (isProcessingUpdate.current) return;

        const stateStr = JSON.stringify(state);
        if (stateStr === lastBroadcastStateStr.current) return;
        if (stateStr === lastReceivedStateStr.current) return;

        // Broadcast to pure local tabs instantly via BroadcastChannel
        bcRef.current?.postMessage({ ...state, id: matchId || state.id });

        // Broadcast to cross-device sessions via Socket.io
        socket.emit('match-update', { ...state, id: matchId || state.id });
        lastBroadcastStateStr.current = stateStr;

        // Sync with local watch sync plugin
        try {
            const lastSubEvent = state.events.slice().reverse().find(e => e.type === 'SUBSTITUTION');
            let subOutStr = "";
            let subInStr = "";
            if (lastSubEvent) {
                const team = lastSubEvent.teamId === 'HOME' ? state.homeTeam : state.awayTeam;
                const pOut = team.players.find(p => p.id === lastSubEvent.subOutId);
                const pIn = team.players.find(p => p.id === lastSubEvent.subInId);
                subOutStr = pOut ? `#${pOut.number} ${pOut.name}` : "";
                subInStr = pIn ? `#${pIn.number} ${pIn.name}` : "";
            }

            fetch('http://localhost:3000/api/sync-watch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    homeScore: state.events ? state.events.filter(e => e.teamId === 'HOME' && e.type === 'SHOT' && e.result === 'GOAL').length : 0,
                    awayScore: state.events ? state.events.filter(e => e.teamId === 'AWAY' && e.type === 'SHOT' && e.result === 'GOAL').length : 0,
                    gameTime: Math.floor(Math.max(0, (state.halfDurationSeconds || 1500) - (state.timer?.elapsedSeconds || 0))) * 1000,
                    shotClock: Math.floor(state.shotClock?.seconds || 0) * 1000,
                    isGameTimeRunning: state.timer?.isRunning || false,
                    isShotClockRunning: state.shotClock?.isRunning || false,
                    period: state.currentHalf || 1,
                    subPending: false, 
                    latestSubId: lastSubEvent?.id || "",
                    subOut: subOutStr,
                    subIn: subInStr,
                    timeoutTeam: state.timeout?.isActive ? (state.timeout.teamId === 'HOME' ? state.homeTeam.name : state.awayTeam.name) : "",
                    watchControlMode: settings.watchControlMode
                })
            }).catch(() => {});
        } catch(e) {}
    }, [socket, settings.watchControlMode]);

    const debouncedBroadcast = useRef<NodeJS.Timeout | null>(null);
    const broadcastUpdateDebounced = useCallback((state: MatchState, delay: number = 100) => {
        if (debouncedBroadcast.current) clearTimeout(debouncedBroadcast.current);
        debouncedBroadcast.current = setTimeout(() => broadcastUpdate(state), delay);
    }, [broadcastUpdate]);

    const registerView = useCallback((viewName: string) => {
        viewNameRef.current = viewName;
        if (socket) socket.emit('register-view', viewName);
    }, [socket]);

    const watchSession = useMemo(() => ({
        id: 'wear-os-adb',
        view: 'WATCH',
        ip: 'ADB Bridge',
        userAgent: `Wear OS Emulator (${settings.watchControlMode})`,
        connectedAt: Date.now()
    }), [settings.watchControlMode]);

    const combinedSessions = useMemo(() => [...activeSessions, watchSession], [activeSessions, watchSession]);

    const sendHapticSignal = useCallback((signalType: string) => {
        if (socket?.connected) {
             socket.emit('haptic-signal', {
                 matchId,
                 hapticSignal: signalType,
                 hapticSignalId: generateUUID()
             });
        }
        fetch('http://localhost:3000/api/sync-watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hapticSignal: signalType, hapticSignalId: generateUUID() })
        }).catch(() => {});
    }, [socket]);

    return { broadcastUpdate, broadcastUpdateDebounced, activeSessions: combinedSessions, registerView, sendHapticSignal, socket };
};

