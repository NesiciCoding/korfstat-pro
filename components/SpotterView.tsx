import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MatchState, TeamId } from '../types';
import { ArrowLeft, Target, ShieldAlert, BadgeX, Activity } from 'lucide-react';

interface SpotterViewProps {
    matchState: MatchState;
    onBack: () => void;
}

// Ensure socket connection
const socket: Socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3002' : `http://${window.location.hostname}:3002`);

const SpotterView: React.FC<SpotterViewProps> = ({ matchState, onBack }) => {
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        // Notify server we are a spotter
        socket.emit('register-view', 'SPOTTER');

        return () => {
            socket.off('spotter-action');
        };
    }, []);

    const sendAction = (type: 'GOAL' | 'MISS' | 'TURNOVER' | 'FOUL', teamId: TeamId) => {
        const action = {
            type,
            teamId,
            timestamp: Date.now()
        };

        socket.emit('spotter-action', action);

        // UI Feedback
        setFeedback(`${type} - ${teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}`);
        setTimeout(() => setFeedback(null), 1500);
    };

    const TeamControls = ({ teamId, name, color }: { teamId: TeamId, name: string, color: string }) => (
        <div className="flex-1 flex flex-col gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
            <div
                className="text-center py-2 font-bold text-lg rounded text-white mb-2"
                style={{ backgroundColor: color }}
            >
                {name || (teamId === 'HOME' ? 'Home' : 'Away')}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
                <button
                    onClick={() => sendAction('GOAL', teamId)}
                    className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <Target size={32} className="mb-2" />
                    <span className="font-bold text-lg">GOAL</span>
                </button>

                <button
                    onClick={() => sendAction('MISS', teamId)}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <BadgeX size={32} className="mb-2" />
                    <span className="font-bold text-lg">MISS</span>
                </button>

                <button
                    onClick={() => sendAction('TURNOVER', teamId)}
                    className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <Activity size={32} className="mb-2" />
                    <span className="font-bold text-lg">TURNOVER</span>
                </button>

                <button
                    onClick={() => sendAction('FOUL', teamId)}
                    className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <ShieldAlert size={32} className="mb-2" />
                    <span className="font-bold text-lg">FOUL</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                        <Target className="text-indigo-500" /> Spotter Mode
                    </h1>
                    <p className="text-xs text-green-500 font-mono">Connected</p>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Main Controls */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-4xl mx-auto w-full">
                <TeamControls
                    teamId="HOME"
                    name={matchState.homeTeam.name}
                    color={matchState.homeTeam.color}
                />

                <div className="hidden md:flex flex-col justify-center items-center text-gray-300 dark:text-gray-600 font-bold text-2xl">
                    VS
                </div>

                <TeamControls
                    teamId="AWAY"
                    name={matchState.awayTeam.name}
                    color={matchState.awayTeam.color}
                />
            </div>

            {matchState.events.length > 0 && (
                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Last Event: {matchState.events[matchState.events.length - 1].type}
                </div>
            )}

            {/* Feedback Toast */}
            {feedback && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full shadow-xl font-bold animate-bounce">
                    Sent: {feedback}
                </div>
            )}
        </div>
    );
};

export default SpotterView;
