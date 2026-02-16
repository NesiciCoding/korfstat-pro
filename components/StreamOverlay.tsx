import React, { useEffect, useState } from 'react';
import { MatchState, TeamId, MatchEvent } from '../types';
import { Clock, Shield, AlertTriangle, ArrowRightLeft, Timer, Repeat, Shirt } from 'lucide-react';
import { getScore, formatTime } from '../utils/matchUtils';

interface StreamOverlayProps {
    matchState: MatchState;
}

const StreamOverlay: React.FC<StreamOverlayProps> = ({ matchState }) => {
    const [activePopup, setActivePopup] = useState<{
        id: string;
        type: 'GOAL' | 'CARD' | 'TIMEOUT';
        text: string;
        subText?: string;
        color: string;
        teamId?: TeamId;
    } | null>(null);

    // Poll for new events to trigger popups (Auto Mode)
    useEffect(() => {
        // If there is a manual override, don't show auto-popups (or maybe show them underneath? No, override should hide auto)
        // Actually, broadcast might want to show "Goal" even if a ticker is running.
        // Let's say: FULLSCREEN override blocks everything. POPUP override replaces auto-popup. SCROLL doesn't block popup.

        if (matchState.events.length === 0) return;
        const lastEvent = matchState.events[matchState.events.length - 1];

        const now = Date.now();
        if (now - lastEvent.realTime < 5000) {
            if (activePopup?.id === lastEvent.id) return; // Already showing

            let popupData = null;

            if (lastEvent.type === 'SHOT' && lastEvent.result === 'GOAL') {
                const team = lastEvent.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
                const player = team.players.find(p => p.id === lastEvent.playerId);
                popupData = {
                    id: lastEvent.id,
                    type: 'GOAL',
                    text: 'GOAL!',
                    subText: player ? `${player.name} (${player.number})` : team.name,
                    color: team.color,
                    teamId: lastEvent.teamId
                };
            } else if (lastEvent.type === 'CARD') {
                const team = lastEvent.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
                const player = team.players.find(p => p.id === lastEvent.playerId);
                popupData = {
                    id: lastEvent.id,
                    type: 'CARD',
                    text: `${lastEvent.cardType} CARD`,
                    subText: player ? `${player.name}` : team.name,
                    color: lastEvent.cardType === 'RED' ? '#ef4444' : '#eab308',
                    teamId: lastEvent.teamId
                };
            } else if (lastEvent.type === 'TIMEOUT') {
                const team = lastEvent.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
                popupData = {
                    id: lastEvent.id,
                    type: 'TIMEOUT',
                    text: 'TIME OUT',
                    subText: team.name,
                    color: team.color,
                    teamId: lastEvent.teamId
                };
            }

            if (popupData) {
                // Only set auto-popup if no manual popup override is active
                if (!matchState.overlayOverride || matchState.overlayOverride.type === 'SCROLL') {
                    setActivePopup(popupData as any);
                    const timer = setTimeout(() => setActivePopup(null), 5000);
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [matchState.events, activePopup, matchState.overlayOverride]);




    // URL param to toggle bg
    const params = new URLSearchParams(window.location.search);
    const transparent = params.get('bg') === 'transparent';
    const bgColor = transparent ? 'transparent' : '#00b140'; // Chroma Green

    const override = matchState.overlayOverride;

    return (
        <div className="w-screen h-screen overflow-hidden font-sans relative" style={{ backgroundColor: bgColor }}>

            {/* FULLSCREEN OVERRIDE */}
            {override?.visible && override.type === 'FULLSCREEN' && (
                <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
                    <h1 className="text-6xl font-black uppercase mb-4 tracking-tighter">{override.text}</h1>
                    {override.subText && <p className="text-3xl text-slate-400 font-bold">{override.subText}</p>}
                </div>
            )}

            {/* 1. Scoreboard Bar (Bottom) - Hide if Fullscreen override */}
            {(!override || override.type !== 'FULLSCREEN') && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-stretch shadow-2xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-10 duration-700 z-10">

                    {/* Home Team */}
                    <div className="bg-slate-900 border-r border-slate-800 text-white w-64 flex items-center justify-between px-6 py-2 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-3" style={{ backgroundColor: matchState.homeTeam.color }}></div>
                        <span className="font-bold text-2xl uppercase tracking-wider truncate pl-2">{matchState.homeTeam.name}</span>
                        <span className="font-black text-5xl font-mono leading-none">{getScore(matchState, 'HOME')}</span>
                    </div>

                    {/* Center Clock */}
                    <div className="bg-slate-800 text-white w-48 flex flex-col items-center justify-center p-2 px-4 relative">
                        {/* Period Indicator */}
                        <div className="mb-[10px] text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            {matchState.currentHalf <= 2 ? `${matchState.currentHalf}${matchState.currentHalf === 1 ? 'st' : 'nd'} HALF` : `OT ${matchState.currentHalf - 2}`}
                        </div>

                        <div className={`text-4xl font-mono font-black ${matchState.timer.isRunning ? 'text-white' : 'text-red-400'}`}>
                            {formatTime(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds))}
                        </div>

                        {/* Shot Clock (Small) */}
                        <div className="flex items-center gap-1 mt-1">
                            <div className={`text-xl font-mono font-bold ${matchState.shotClock.seconds <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                                {Math.ceil(matchState.shotClock.seconds)}
                            </div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">SHOT</span>
                        </div>
                        {matchState.timeout.isActive && (
                            <div className="absolute inset-x-0 bottom-0 bg-purple-600 text-[10px] font-bold text-center animate-pulse">
                                TIMEOUT
                            </div>
                        )}
                    </div>

                    {/* Away Team */}
                    <div className="bg-slate-900 border-l border-slate-800 text-white w-64 flex items-center justify-between px-6 py-2 relative overflow-hidden flex-row-reverse">
                        <div className="absolute right-0 top-0 bottom-0 w-3" style={{ backgroundColor: matchState.awayTeam.color }}></div>
                        <span className="font-bold text-2xl uppercase tracking-wider truncate pr-2">{matchState.awayTeam.name}</span>
                        <span className="font-black text-5xl font-mono leading-none">{getScore(matchState, 'AWAY')}</span>
                    </div>
                </div>
            )}


            {/* 2. POPUPS (Lower Third) - Manual Override OR Auto Event */}
            {/* If Manual Popup Override exists, show it. Else show Active Auto Popup. */}
            {((override?.visible && override.type === 'POPUP') || activePopup) && (
                <div className="absolute bottom-40 left-1/2 -translate-x-1/2 animate-in slide-in-from-bottom-5 fade-in duration-300 z-20">
                    <div className="flex flex-col items-center">
                        <div
                            className="px-12 py-3 rounded-t-xl font-bold text-white text-lg tracking-widest uppercase shadow-lg"
                            style={{ backgroundColor: override?.type === 'POPUP' ? (override.color || '#6366f1') : activePopup?.color }}
                        >
                            {override?.type === 'POPUP' ? override.text : activePopup?.text}
                        </div>
                        <div className="bg-white/95 backdrop-blur text-slate-900 px-16 py-4 rounded-b-xl rounded-t-sm shadow-xl border-t-4 border-black/10 min-w-[400px] text-center">
                            <h2 className="text-3xl font-black uppercase">
                                {override?.type === 'POPUP' ? override.subText : activePopup?.subText}
                            </h2>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. SCROLLING TICKER override */}
            {override?.visible && override.type === 'SCROLL' && (
                <div className="absolute bottom-0 left-0 right-0 bg-indigo-900/90 text-white py-2 z-30 overflow-hidden whitespace-nowrap border-t border-indigo-500">
                    <div className="inline-block animate-marquee pl-[100%] font-bold text-xl uppercase tracking-wider">
                        {override.text} {override.subText && <span className="text-indigo-300 mx-4">• {override.subText}</span>}
                    </div>
                </div>
            )}

            {/* Break Overlay */}
            {matchState.break?.isActive && (!override || override.type !== 'FULLSCREEN') && (
                <div className="absolute top-10 right-10 flex flex-col items-end">
                    <div className="bg-indigo-600 text-white px-6 py-2 rounded-t-lg font-bold text-sm uppercase tracking-wider shadow-lg">
                        HALFTIME BREAK
                    </div>
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-b-lg rounded-tl-lg shadow-xl font-mono text-5xl font-black border-4 border-indigo-600">
                        {formatTime(matchState.break.durationSeconds)}
                    </div>
                </div>
            )}

        </div>
    );
};

export default StreamOverlay;
