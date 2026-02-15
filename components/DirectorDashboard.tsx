import React, { useState } from 'react';
import { MatchState, OverlayMessage, TeamId } from '../types';
import StreamOverlay from './StreamOverlay'; // For Preview
import CommentaryFeed from './CommentaryFeed';
import { Monitor, Type, MessageSquare, Zap, Play, Square, LayoutTemplate, ALargeSmall, Maximize, History } from 'lucide-react';

interface DirectorDashboardProps {
    matchState: MatchState;
    setMatchState: (state: MatchState) => void;
    broadcastUpdate: (state: MatchState) => void;
}

const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ matchState, setMatchState, broadcastUpdate }) => {
    // Local state for the "Preview" / Builder
    const [previewMessage, setPreviewMessage] = useState<OverlayMessage>({
        id: 'preview',
        text: '',
        subText: '',
        type: 'POPUP', // Default
        color: '#6366f1',
        visible: true
    });

    const [activeTab, setActiveTab] = useState<'QUICK' | 'CUSTOM'>('QUICK');

    // Helper to push state update
    const pushOverride = (override: OverlayMessage | null) => {
        const newState = { ...matchState, overlayOverride: override };
        setMatchState(newState);
        broadcastUpdate(newState);
    };

    const handleGoLive = () => {
        // Create a copy of preview as the live message
        pushOverride({
            ...previewMessage,
            id: `msg_${Date.now()}`, // Unique ID to force re-render if needed
            visible: true
        });
    };

    const handleClearLive = () => {
        pushOverride(null);
    };

    // Quick Actions
    const triggerQuickPopup = (type: 'GOAL' | 'TIMEOUT', teamId: TeamId) => {
        const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        const msg: OverlayMessage = {
            id: `quick_${Date.now()}`,
            type: 'POPUP',
            text: type === 'GOAL' ? 'GOAL!' : 'TIME OUT',
            subText: team.name, // concise
            color: team.color,
            visible: true
        };
        pushOverride(msg);

        // Auto-clear quick actions after 6s
        setTimeout(() => {
            pushOverride(null);
        }, 6000);
    };

    // Construct a "Fake" match state for the PREVIEW window
    const previewMatchState: MatchState = {
        ...matchState,
        overlayOverride: previewMessage
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white px-3 py-1 rounded font-black tracking-tighter animate-pulse">LIVE</div>
                    <div className="h-6 w-px bg-slate-700"></div>
                    <h1 className="font-bold text-lg text-slate-100 italic">DIRECTOR CONSOLE</h1>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: CONTROLS */}
                <div className="w-1/3 min-w-[400px] border-r border-slate-800 bg-slate-900/50 flex flex-col p-6 gap-6 overflow-y-auto">

                    {/* AI Commentary Feed */}
                    <div className="mb-2">
                        <CommentaryFeed matchState={matchState} compact />
                    </div>

                    {/* Live Status Card */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg relative overflow-hidden group">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={14} className={matchState.overlayOverride ? "text-red-500" : "text-slate-600"} />
                            Current On-Air Status
                        </h3>

                        {matchState.overlayOverride ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-green-400 font-bold">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                                    Override Active
                                </div>
                                <div className="bg-black/30 p-3 rounded font-mono text-sm border-l-4 border-green-500">
                                    {matchState.overlayOverride.text} <br />
                                    <span className="text-slate-400 text-xs">{matchState.overlayOverride.subText}</span>
                                </div>
                                <button onClick={handleClearLive} className="mt-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold shadow-md transition-all flex items-center justify-center gap-2">
                                    <Square size={16} fill="currentColor" /> STOP OVERRIDE
                                </button>
                            </div>
                        ) : (
                            <div className="text-slate-500 italic flex items-center gap-2">
                                <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                                Running Auto-Pilot (Event based)
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} /> Quick Triggers (6s)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => triggerQuickPopup('GOAL', 'HOME')} className="bg-indigo-900/50 hover:bg-indigo-600 border border-indigo-700 hover:border-indigo-500 text-indigo-100 py-3 rounded font-bold transition-all text-sm flex items-center justify-center gap-2">
                                GOAL HOME
                            </button>
                            <button onClick={() => triggerQuickPopup('GOAL', 'AWAY')} className="bg-indigo-900/50 hover:bg-indigo-600 border border-indigo-700 hover:border-indigo-500 text-indigo-100 py-3 rounded font-bold transition-all text-sm flex items-center justify-center gap-2">
                                GOAL AWAY
                            </button>
                            <button onClick={() => triggerQuickPopup('TIMEOUT', 'HOME')} className="bg-purple-900/50 hover:bg-purple-600 border border-purple-700 hover:border-purple-500 text-purple-100 py-3 rounded font-bold transition-all text-sm flex items-center justify-center gap-2">
                                TIMEOUT HOME
                            </button>
                            <button onClick={() => triggerQuickPopup('TIMEOUT', 'AWAY')} className="bg-purple-900/50 hover:bg-purple-600 border border-purple-700 hover:border-purple-500 text-purple-100 py-3 rounded font-bold transition-all text-sm flex items-center justify-center gap-2">
                                TIMEOUT AWAY
                            </button>
                        </div>
                    </div>


                    {/* Custom Builder */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg flex-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Type size={14} /> Custom Message Builder</h3>

                        <div className="space-y-4">
                            {/* Type Selector */}
                            <div className="flex bg-slate-900 p-1 rounded-lg">
                                <button
                                    onClick={() => setPreviewMessage({ ...previewMessage, type: 'POPUP' })}
                                    className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${previewMessage.type === 'POPUP' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <LayoutTemplate size={16} /> Lower 3rd
                                </button>
                                <button
                                    onClick={() => setPreviewMessage({ ...previewMessage, type: 'SCROLL' })}
                                    className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${previewMessage.type === 'SCROLL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <ALargeSmall size={16} /> Ticker
                                </button>
                                <button
                                    onClick={() => setPreviewMessage({ ...previewMessage, type: 'FULLSCREEN' })}
                                    className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${previewMessage.type === 'FULLSCREEN' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Maximize size={16} /> Full
                                </button>
                            </div>

                            {/* Inputs */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Main Text</label>
                                <input
                                    value={previewMessage.text}
                                    onChange={(e) => setPreviewMessage({ ...previewMessage, text: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    placeholder={previewMessage.type === 'SCROLL' ? "Breaking News..." : "GOAL!"}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Sub Text / Detail</label>
                                <input
                                    value={previewMessage.subText || ''}
                                    onChange={(e) => setPreviewMessage({ ...previewMessage, subText: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder={previewMessage.type === 'SCROLL' ? "Additional details..." : "Player Name"}
                                />
                            </div>

                            {/* Color Picker (for Popup) */}
                            {previewMessage.type === 'POPUP' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Accent Color</label>
                                    <div className="flex gap-2">
                                        {[
                                            { c: '#6366f1', n: 'Indigo' },
                                            { c: '#ef4444', n: 'Red' },
                                            { c: '#eab308', n: 'Yellow' },
                                            { c: '#22c55e', n: 'Green' },
                                            { c: matchState.homeTeam.color, n: 'Home' },
                                            { c: matchState.awayTeam.color, n: 'Away' }
                                        ].map(col => (
                                            <button
                                                key={col.c}
                                                onClick={() => setPreviewMessage({ ...previewMessage, color: col.c })}
                                                className={`w-8 h-8 rounded-full border-2 ${previewMessage.color === col.c ? 'border-white ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-800' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                                style={{ backgroundColor: col.c }}
                                                title={col.n}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleGoLive}
                                className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white text-lg font-black uppercase py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                            >
                                <Play size={24} fill="currentColor" /> GO LIVE
                            </button>
                            <p className="text-center text-xs text-slate-500 mt-2">Updates override immediately.</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: PREVIEW */}
                <div className="flex-1 bg-black flex flex-col relative w-full h-[56.25vw] max-h-screen">
                    <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur rounded px-3 py-1 text-xs font-bold text-slate-400 border border-slate-700 z-50 flex items-center gap-2">
                        <Monitor size={14} /> PREVIEW MONITOR
                    </div>
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
                        {/* Container for proper 16:9 aspect ratio scaling */}
                        <div className="relative w-full h-full">
                            <div className="absolute inset-0 flex items-center justify-center">
                                {/* We render standard Overlay but force it into container */}
                                <div className="transform scale-[0.6] origin-center w-screen h-screen pointer-events-none select-none border-4 border-slate-800 shadow-2xl">
                                    <StreamOverlay matchState={previewMatchState} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DirectorDashboard;
