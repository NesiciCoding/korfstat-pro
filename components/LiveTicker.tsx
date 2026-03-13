import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Target, AlertCircle } from 'lucide-react';

// Use standard types if available, otherwise define simple ones for the ticker
interface TickerData {
    matchId: string;
    status: string;
    clock: {
        period: number;
        timerRunning: boolean;
        timeRemaining: number;
        currentMinute: number;
    };
    score: {
        home: number;
        away: number;
        homeTeam: string;
        awayTeam: string;
        homeColor: string;
        awayColor: string;
    };
    lastEvent: {
        type: string;
        description: string;
        timestamp: number;
    } | null;
}

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : `http://${window.location.hostname}:3002`;

const LiveTicker: React.FC = () => {
    const [data, setData] = useState<TickerData | null>(null);
    const [status, setStatus] = useState<'CONNECTING' | 'LIVE' | 'OFFLINE'>('CONNECTING');

    useEffect(() => {
        const socket: Socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('[Ticker] Connected');
            setStatus('LIVE');
        });

        socket.on('ticker-update', (newData: TickerData) => {
            console.log('[Ticker] Update:', newData);
            setData(newData);
        });

        socket.on('disconnect', () => {
            console.log('[Ticker] Disconnected');
            setStatus('OFFLINE');
        });

        // Initial fetch via REST API
        fetch(`${SOCKET_URL}/api/ticker`)
            .then(res => res.json())
            .then(initialData => {
                if (initialData && !initialData.message) {
                    setData(initialData);
                }
            })
            .catch(err => console.error('[Ticker] Fetch error:', err));

        return () => {
            socket.disconnect();
        };
    }, []);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 text-zinc-500 h-screen font-sans">
                {status === 'CONNECTING' ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bold tracking-widest uppercase text-xs">Connecting to Match...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={32} className="text-zinc-700" />
                        <span className="font-bold uppercase text-xs">No Active Match Found</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-zinc-950 font-sans overflow-hidden">
            {/* Top Bar */}
            <div className={`px-4 py-1 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100 dark:border-zinc-900 ${status === 'LIVE' ? 'text-green-600' : 'text-red-500'}`}>
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'LIVE' ? 'bg-green-600 animate-pulse' : 'bg-red-500'}`}></span>
                    {status}
                </div>
                <div className="text-zinc-400">KorfStat Pro</div>
            </div>

            {/* Scoreboard */}
            <div className="flex-1 flex items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900">
                {/* Home */}
                <div className="text-center flex-1">
                    <div className="text-xs font-bold text-zinc-500 uppercase mb-1 truncate px-2">{data.score.homeTeam}</div>
                    <div className="text-5xl font-black tabular-nums" style={{ color: data.score.homeColor }}>{data.score.home}</div>
                </div>

                {/* Clock / VS */}
                <div className="flex flex-col items-center justify-center px-4 w-24">
                    <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white leading-none">
                        {data.clock.currentMinute}'
                    </div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase mt-1">
                        {data.clock.period === 1 ? '1st' : data.clock.period === 2 ? '2nd' : `P${data.clock.period}`} HALF
                    </div>
                </div>

                {/* Away */}
                <div className="text-center flex-1">
                    <div className="text-xs font-bold text-zinc-500 uppercase mb-1 truncate px-2">{data.score.awayTeam}</div>
                    <div className="text-5xl font-black tabular-nums" style={{ color: data.score.awayColor }}>{data.score.away}</div>
                </div>
            </div>

            {/* Event Footer */}
            <div className="h-10 bg-zinc-50 dark:bg-zinc-900/50 flex items-center px-4 gap-3 overflow-hidden">
                <div className="flex-shrink-0">
                    <Target size={14} className="text-zinc-400" />
                </div>
                <div className="flex-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate">
                    {data.lastEvent ? (
                        <span className="animate-in fade-in slide-in-from-left duration-300">
                            <span className="font-bold text-zinc-900 dark:text-zinc-200 mr-2">[{data.lastEvent.type}]</span>
                            {data.lastEvent.description}
                        </span>
                    ) : (
                        <span className="italic opacity-50">Waiting for match events...</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveTicker;
