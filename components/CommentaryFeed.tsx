import React, { useState, useEffect, useRef } from 'react';
import { MatchState } from '../types';
import { generateLiveCommentary } from '../services/geminiService';
import { MessageSquare, Sparkles, AlertCircle } from 'lucide-react';

interface CommentaryFeedProps {
    matchState: MatchState;
    compact?: boolean;
}

interface CommentaryItem {
    id: string;
    text: string;
    timestamp: string;
    isAi: boolean;
}

const CommentaryFeed: React.FC<CommentaryFeedProps> = ({ matchState, compact = false }) => {
    const [items, setItems] = useState<CommentaryItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [autoMode, setAutoMode] = useState(false);
    const lastEventRef = useRef<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of feed
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [items]);

    // Check for interesting events to auto-trigger textual updates (non-AI simple log)
    useEffect(() => {
        if (matchState.events.length === 0) return;

        const lastEvent = matchState.events[matchState.events.length - 1];
        if (lastEvent.id !== lastEventRef.current) {
            lastEventRef.current = lastEvent.id;

            // Simple log item
            const teamName = lastEvent.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name;
            const player = lastEvent.teamId === 'HOME'
                ? matchState.homeTeam.players.find(p => p.id === lastEvent.playerId)
                : matchState.awayTeam.players.find(p => p.id === lastEvent.playerId);

            let text = `${teamName}: ${lastEvent.type}`;
            if (lastEvent.result) text += ` - ${lastEvent.result}`;
            if (player) text += ` (${player.name})`;

            setItems(prev => [...prev.slice(-19), {
                id: lastEvent.id,
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isAi: false
            }]);

            // Auto-Generate AI commentary on Goals if autoMode is on
            if (autoMode && lastEvent.result === 'GOAL') {
                triggerAiCommentary();
            }
        }
    }, [matchState.events, matchState.homeTeam, matchState.awayTeam, autoMode]); // Removed triggerAiCommentary from deps to avoid cycle

    const triggerAiCommentary = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        const commentary = await generateLiveCommentary(matchState);

        setItems(prev => [...prev.slice(-19), {
            id: `ai-${Date.now()}`,
            text: commentary,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isAi: true
        }]);

        setIsGenerating(false);
    };

    return (
        <div className={`flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${compact ? 'h-64' : 'h-96'}`}>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <MessageSquare size={18} /> Live Feed
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoMode(!autoMode)}
                        className={`p-1.5 rounded text-xs font-bold transition-colors ${autoMode ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                        title="Auto-generate AI commentary on goals"
                    >
                        AUTO {autoMode ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={triggerAiCommentary}
                        disabled={isGenerating}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                        title="Generate AI Insight now"
                    >
                        <Sparkles size={14} /> {isGenerating ? 'Thinking...' : 'AI Insight'}
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/50"
            >
                {items.length === 0 && (
                    <div className="text-center text-gray-400 italic text-sm mt-10">
                        Waiting for match events...
                    </div>
                )}

                {items.map(item => (
                    <div key={item.id} className={`flex gap-3 ${item.isAi ? 'animate-in fade-in slide-in-from-bottom-2' : ''}`}>
                        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${item.isAi ? 'bg-indigo-500' : 'bg-gray-400'}`}></div>
                        <div className="flex-1">
                            <div className={`text-sm ${item.isAi ? 'text-indigo-700 dark:text-indigo-300 font-medium italic' : 'text-gray-600 dark:text-gray-400'}`}>
                                {item.text}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{item.timestamp} {item.isAi && '• AI Analysis'}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommentaryFeed;
