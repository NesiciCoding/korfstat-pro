import React, { useRef, useEffect, useState } from 'react';
import { MatchState } from '../types';
import { getScore } from '../utils/matchUtils'; // Assuming util exists now
import { Download, Share2, X, RefreshCw, Smartphone, Monitor } from 'lucide-react';

interface SocialShareModalProps {
    matchState: MatchState;
    onClose: () => void;
}

const SocialShareModal: React.FC<SocialShareModalProps> = ({ matchState, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [aspectRatio, setAspectRatio] = useState<'SQUARE' | 'PORTRAIT' | 'LANDSCAPE'>('SQUARE');
    const [theme, setTheme] = useState<'DARK' | 'LIGHT'>('DARK');

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Dimensions
        const width = 1080;
        const height = aspectRatio === 'SQUARE' ? 1080 : aspectRatio === 'PORTRAIT' ? 1920 : 608;
        canvas.width = width;
        canvas.height = height;

        // Colors
        const bgColor = theme === 'DARK' ? '#0f172a' : '#f8fafc';
        const textColor = theme === 'DARK' ? '#f8fafc' : '#0f172a';
        const subTextColor = theme === 'DARK' ? '#94a3b8' : '#64748b';
        const accentColor = '#6366f1'; // Indigo-500

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // Decorative gradient/shapes
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        if (theme === 'DARK') {
            gradient.addColorStop(0, '#1e293b');
            gradient.addColorStop(1, '#0f172a');
        } else {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#f1f5f9');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Header (League/Match Info)
        ctx.textAlign = 'center';
        ctx.fillStyle = subTextColor;
        ctx.font = 'bold 32px Inter, sans-serif'; // Fallback to sans-serif
        // If season name available, use it? Or date
        const dateStr = new Date(matchState.date || Date.now()).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        ctx.fillText("MATCH RESULT", width / 2, 80);
        ctx.font = '28px Inter, sans-serif';
        ctx.fillText(dateStr, width / 2, 120);

        // Scores
        const homeScore = getScore(matchState, 'HOME');
        const awayScore = getScore(matchState, 'AWAY');

        // Team Blocks
        const centerY = height / 2;
        const teamBlockWidth = 400;

        // HOME TEAM
        // Name
        ctx.font = 'bold 64px Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.fillText(matchState.homeTeam.name.toUpperCase(), width / 4, centerY - 100);

        // Color Bar
        ctx.fillStyle = matchState.homeTeam.color;
        ctx.fillRect(width / 4 - 50, centerY - 80, 100, 10);

        // Score
        ctx.font = 'bold 200px Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.fillText(homeScore.toString(), width / 4, centerY + 100);


        // AWAY TEAM
        // Name
        ctx.font = 'bold 64px Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.fillText(matchState.awayTeam.name.toUpperCase(), (width / 4) * 3, centerY - 100);

        // Color Bar
        ctx.fillStyle = matchState.awayTeam.color;
        ctx.fillRect((width / 4) * 3 - 50, centerY - 80, 100, 10);

        // Score
        ctx.font = 'bold 200px Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.fillText(awayScore.toString(), (width / 4) * 3, centerY + 100);


        // VS / Divider
        ctx.font = 'italic bold 48px Inter, sans-serif';
        ctx.fillStyle = subTextColor;
        ctx.fillText("VS", width / 2, centerY);


        // Footer branding
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText("KorfStat Pro", width / 2, height - 60);

        // MVP / Top Scorer Logic (Optional)
        // Find top scorer
        const allPlayers = [...matchState.homeTeam.players, ...matchState.awayTeam.players];
        const playerGoals = allPlayers
            .map(p => ({
                name: p.name,
                goals: matchState.events.filter(e => e.playerId === p.id && e.type === 'SHOT' && e.result === 'GOAL').length,
                team: matchState.homeTeam.players.find(hp => hp.id === p.id) ? 'HOME' : 'AWAY'
            }))
            .sort((a, b) => b.goals - a.goals);

        const topScorer = playerGoals[0];
        if (topScorer && topScorer.goals > 0) {
            ctx.font = 'italic 32px Inter, sans-serif';
            ctx.fillStyle = subTextColor;
            ctx.fillText(`Top Scorer: ${topScorer.name} (${topScorer.goals})`, width / 2, height - 120);
        }

    };

    useEffect(() => {
        drawCanvas();
    }, [aspectRatio, theme, matchState]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `match-result-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Preview Area */}
                <div className="flex-1 bg-slate-100 dark:bg-black flex items-center justify-center p-8 overflow-y-auto">
                    <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-[70vh] shadow-2xl border-4 border-white dark:border-slate-800 rounded-lg"
                    />
                </div>

                {/* Controls Sidebar */}
                <div className="w-full md:w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <Share2 className="text-indigo-500" /> Share Result
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Theme Toggle */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Theme</label>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                            <button
                                onClick={() => setTheme('DARK')}
                                className={`flex-1 py-2 text-sm font-bold rounded transition-all ${theme === 'DARK' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Dark
                            </button>
                            <button
                                onClick={() => setTheme('LIGHT')}
                                className={`flex-1 py-2 text-sm font-bold rounded transition-all ${theme === 'LIGHT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Light
                            </button>
                        </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Format</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setAspectRatio('SQUARE')}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${aspectRatio === 'SQUARE' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                            >
                                <div className="w-6 h-6 border-2 border-current rounded-sm"></div>
                                <span className="text-[10px] font-bold">Square</span>
                            </button>
                            <button
                                onClick={() => setAspectRatio('PORTRAIT')}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${aspectRatio === 'PORTRAIT' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                            >
                                <div className="w-4 h-6 border-2 border-current rounded-sm"></div>
                                <span className="text-[10px] font-bold">Story</span>
                            </button>
                            <button
                                onClick={() => setAspectRatio('LANDSCAPE')}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${aspectRatio === 'LANDSCAPE' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                            >
                                <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
                                <span className="text-[10px] font-bold">Post</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    <button
                        onClick={handleDownload}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                    >
                        <Download size={20} /> Download Image
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SocialShareModal;
