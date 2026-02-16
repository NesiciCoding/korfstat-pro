import React, { useEffect, useState } from 'react';
import { MatchState, TeamId, MatchEvent } from '../types';
import { Clock, Shield, AlertTriangle, ArrowRightLeft, Timer, Repeat, Shirt } from 'lucide-react';
import { getScore, formatTime } from '../utils/matchUtils';
import { THEME_PRESETS, FONT_OPTIONS } from '../config/broadcastThemes';

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
    const [visiblePopup, setVisiblePopup] = useState<typeof activePopup>(null);
    const [isExiting, setIsExiting] = useState(false);

    // Get theme configuration
    const theme = matchState.broadcastTheme?.theme || 'modern';
    const font = matchState.broadcastTheme?.font || 'inter';
    const showShotClock = matchState.broadcastTheme?.showShotClock !== false;

    const themeConfig = THEME_PRESETS[theme];
    const fontConfig = FONT_OPTIONS[font];

    // Poll for new events to trigger popups (Auto Mode)
    useEffect(() => {
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
                    subText: player ? `${player.name} #${player.number}` : team.name,
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
                    subText: player ? `${player.name} #${player.number}` : team.name,
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

    // Manage popup visibility with exit animation
    useEffect(() => {
        if (activePopup) {
            setVisiblePopup(activePopup);
            setIsExiting(false);
        } else if (visiblePopup) {
            setIsExiting(true);
            const timer = setTimeout(() => {
                setVisiblePopup(null);
                setIsExiting(false);
            }, 500); // match exit animation duration
            return () => clearTimeout(timer);
        }
    }, [activePopup]);

    // URL param to toggle bg
    const params = new URLSearchParams(window.location.search);
    const transparent = params.get('bg') === 'transparent';
    const bgColor = transparent ? 'transparent' : '#00b140'; // Chroma Green

    const override = matchState.overlayOverride;

    // Popup animation class
    const popupAnimationClass = isExiting ? 'popup-exit' : 'popup-enter';

    return (
        <>
            {/* Font Import */}
            <style>{fontConfig.cssImport}</style>

            {/* Custom Animations */}
            <style>{`
                @keyframes popupSlideIn {
                    0% { 
                        transform: translateX(-50%) translateY(80px);
                        opacity: 0;
                    }
                    100% { 
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes popupSlideOut {
                    0% { 
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                    100% { 
                        transform: translateX(-50%) translateY(80px);
                        opacity: 0;
                    }
                }
                .popup-enter {
                    animation: popupSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .popup-exit {
                    animation: popupSlideOut 0.4s ease-in forwards;
                }
                @keyframes glowIn {
                    from { 
                        transform: scale(0.8); 
                        opacity: 0;
                        filter: blur(10px) brightness(2);
                    }
                    to { 
                        transform: scale(1); 
                        opacity: 1;
                        filter: blur(0) brightness(1);
                    }
                }
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
            `}</style>

            <div
                className="w-screen h-screen overflow-hidden relative"
                style={{
                    backgroundColor: bgColor,
                    fontFamily: fontConfig.fontFamily
                }}
            >

                {/* FULLSCREEN OVERRIDE */}
                {override?.visible && override.type === 'FULLSCREEN' && (
                    <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-500">
                        <h1 className="text-8xl font-black uppercase mb-6 tracking-tighter bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                            {override.text}
                        </h1>
                        {override.subText && (
                            <p className="text-4xl text-slate-400 font-bold tracking-wide">{override.subText}</p>
                        )}
                    </div>
                )}

                {/* SCOREBOARD - Hide if Fullscreen override */}
                {(!override || override.type !== 'FULLSCREEN') && (
                    <div
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-stretch overflow-hidden animate-in slide-in-from-bottom-10 duration-700 z-10"
                        style={{
                            boxShadow: themeConfig.scoreboard.glassEffect
                                ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                                : '0 25px 50px -12px rgb(0 0 0 / 0.7)',
                        }}
                    >
                        <div
                            className={`flex items-stretch ${themeConfig.scoreboard.borderStyle}`}
                            style={{
                                backgroundColor: themeConfig.scoreboard.background,
                                backdropFilter: themeConfig.scoreboard.glassEffect ? 'blur(10px)' : 'none',
                                border: themeConfig.scoreboard.glassEffect ? '1px solid rgba(255, 255, 255, 0.18)' : 'none',
                            }}
                        >
                            {/* Home Team */}
                            <div className="text-white w-72 flex items-center justify-between px-8 py-4 relative overflow-hidden">
                                {theme === 'neon' && (
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 animate-pulse"
                                        style={{
                                            backgroundColor: matchState.homeTeam.color,
                                            boxShadow: `0 0 20px ${matchState.homeTeam.color}`
                                        }}
                                    />
                                )}
                                {theme !== 'neon' && (
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-2"
                                        style={{ backgroundColor: matchState.homeTeam.color }}
                                    />
                                )}
                                <span className={`font-bold text-2xl uppercase tracking-wider truncate ${theme === 'neon' ? 'pl-4' : 'pl-3'}`}>
                                    {matchState.homeTeam.name}
                                </span>
                                <span className={`font-black text-6xl font-mono leading-none ${theme === 'neon' ? 'text-cyan-400' : ''}`}>
                                    {getScore(matchState, 'HOME')}
                                </span>
                            </div>

                            {/* Center Clock */}
                            <div className="bg-black/30 backdrop-blur-sm text-white w-52 flex flex-col items-center justify-center p-3 px-6 relative border-x border-white/10">
                                {/* Period Indicator */}
                                <div className="mb-2 text-xs font-bold tracking-widest text-slate-300 uppercase">
                                    {matchState.currentHalf <= 2
                                        ? `${matchState.currentHalf}${matchState.currentHalf === 1 ? 'st' : 'nd'} HALF`
                                        : `OT ${matchState.currentHalf - 2}`}
                                </div>

                                <div
                                    className={`text-5xl font-mono font-black transition-colors ${matchState.timer.isRunning ? 'text-white' : 'text-red-400 animate-pulse'
                                        } ${theme === 'neon' ? 'drop-shadow-[0_0_10px_rgba(0,255,247,0.5)]' : ''}`}
                                >
                                    {formatTime(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds))}
                                </div>

                                {/* Shot Clock */}
                                {showShotClock && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div
                                            className={`text-2xl font-mono font-bold ${matchState.shotClock.seconds <= 5
                                                ? 'text-red-500 animate-pulse'
                                                : theme === 'neon'
                                                    ? 'text-yellow-400'
                                                    : 'text-amber-400'
                                                }`}
                                        >
                                            {Math.ceil(matchState.shotClock.seconds)}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">SHOT</span>
                                    </div>
                                )}

                                {matchState.timeout.isActive && (
                                    <div className="absolute inset-x-0 bottom-0 bg-purple-600 text-[11px] font-bold text-center py-0.5 animate-pulse">
                                        TIMEOUT
                                    </div>
                                )}
                            </div>

                            {/* Away Team */}
                            <div className="text-white w-72 flex items-center justify-between px-8 py-4 relative overflow-hidden flex-row-reverse">
                                {theme === 'neon' && (
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1 animate-pulse"
                                        style={{
                                            backgroundColor: matchState.awayTeam.color,
                                            boxShadow: `0 0 20px ${matchState.awayTeam.color}`
                                        }}
                                    />
                                )}
                                {theme !== 'neon' && (
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2"
                                        style={{ backgroundColor: matchState.awayTeam.color }}
                                    />
                                )}
                                <span className={`font-bold text-2xl uppercase tracking-wider truncate ${theme === 'neon' ? 'pr-4' : 'pr-3'}`}>
                                    {matchState.awayTeam.name}
                                </span>
                                <span className={`font-black text-6xl font-mono leading-none ${theme === 'neon' ? 'text-cyan-400' : ''}`}>
                                    {getScore(matchState, 'AWAY')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* POPUPS (Lower Third) - Appears ABOVE scoreboard */}
                {((override?.visible && override.type === 'POPUP' && override.text) || visiblePopup) && (
                    <div
                        className={`absolute left-1/2 scale-50 z-[5] ${popupAnimationClass}`}
                        style={{
                            bottom: 'calc(4rem + 125px)', /* Position above the scoreboard */
                        }}
                    >
                        <div className="flex flex-col items-center">
                            {/* Top Bar */}
                            <div
                                className={`px-16 py-4 font-black text-white text-2xl tracking-widest uppercase shadow-lg relative overflow-hidden ${theme === 'minimal' ? 'rounded-full' : 'rounded-t-2xl'
                                    }`}
                                style={{
                                    backgroundColor: override?.type === 'POPUP' ? (override.color || '#6366f1') : visiblePopup?.color,
                                    ...(theme === 'neon' ? {
                                        boxShadow: `0 0 30px ${override?.type === 'POPUP' ? (override.color || '#6366f1') : visiblePopup?.color}`
                                    } : {})
                                }}
                            >
                                {theme === 'modern' && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                )}
                                <span className="relative z-10">
                                    {override?.type === 'POPUP' ? override.text : visiblePopup?.text}
                                </span>
                            </div>

                            {/* Bottom Card */}
                            <div
                                className={`bg-white/95 backdrop-blur-md text-slate-900 px-20 py-6 shadow-2xl border-t-4 border-black/10 min-w-[500px] text-center ${theme === 'minimal' ? 'rounded-full' : theme === 'neon' ? 'rounded-b-2xl' : 'rounded-b-2xl rounded-t-sm'
                                    }`}
                                style={{
                                    ...(theme === 'neon' ? {
                                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,0.85))',
                                        color: '#00fff7',
                                        border: 'none',
                                        boxShadow: '0 0 30px rgba(0,255,247,0.3)'
                                    } : {})
                                }}
                            >
                                <h2 className={`text-4xl font-black uppercase tracking-tight ${theme === 'neon' ? 'text-white' : ''}`}>
                                    {override?.type === 'POPUP' ? override.subText : visiblePopup?.subText}
                                </h2>
                            </div>
                        </div>
                    </div>
                )}

                {/* SCROLLING TICKER override */}
                {override?.visible && override.type === 'SCROLL' && (
                    <div
                        className={`absolute bottom-0 left-0 right-0 py-3 z-30 overflow-hidden whitespace-nowrap ${theme === 'neon' ? 'border-t-2 border-cyan-400' : 'border-t border-indigo-500'
                            }`}
                        style={{
                            backgroundColor: theme === 'neon' ? 'rgba(0,0,0,0.95)' : 'rgba(79, 70, 229, 0.9)',
                            backdropFilter: 'blur(10px)',
                            ...(theme === 'neon' ? {
                                boxShadow: '0 0 20px rgba(0,255,247,0.3)'
                            } : {})
                        }}
                    >
                        <div className={`inline-block animate-marquee pl-[100%] font-bold text-2xl uppercase tracking-wider ${theme === 'neon' ? 'text-cyan-400' : 'text-white'}`}>
                            {override.text} {override.subText && (
                                <span className={`mx-6 ${theme === 'neon' ? 'text-white' : 'text-indigo-300'}`}>• {override.subText}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Break Overlay */}
                {matchState.break?.isActive && (!override || override.type !== 'FULLSCREEN') && (
                    <div className="absolute top-10 right-10 flex flex-col items-end animate-in slide-in-from-right duration-500">
                        <div
                            className={`text-white px-8 py-3 rounded-t-xl font-bold text-sm uppercase tracking-wider shadow-lg ${theme === 'neon' ? 'bg-black/90 border border-purple-500' : 'bg-indigo-600'
                                }`}
                            style={{
                                ...(theme === 'neon' ? {
                                    boxShadow: '0 0 20px rgba(168,85,247,0.4)'
                                } : {})
                            }}
                        >
                            HALFTIME BREAK
                        </div>
                        <div
                            className={`text-white px-12 py-6 rounded-b-xl rounded-tl-xl shadow-2xl font-mono text-6xl font-black ${theme === 'neon' ? 'bg-black/90 border-4 border-purple-500' : 'bg-slate-900 border-4 border-indigo-600'
                                }`}
                            style={{
                                ...(theme === 'neon' ? {
                                    boxShadow: '0 0 30px rgba(168,85,247,0.5)',
                                    color: '#a855f7'
                                } : {})
                            }}
                        >
                            {formatTime(matchState.break.durationSeconds)}
                        </div>
                    </div>
                )}

            </div>
        </>
    );
};

export default StreamOverlay;
