import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MatchState, TeamId } from '../types';
import { ArrowLeft, Target, ShieldAlert, BadgeX, Activity, Mic, MicOff, Info } from 'lucide-react';
import { useVoiceCommands, VoiceCommandAction } from '../hooks/useVoiceCommands';
import { useTranslation } from 'react-i18next';

interface SpotterViewProps {
    matchState: MatchState;
    onBack: () => void;
}

// Ensure socket connection
const socket: Socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3002' : `http://${window.location.hostname}:3002`);

const SpotterView: React.FC<SpotterViewProps> = ({ matchState, onBack }) => {
    const { t } = useTranslation();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [showVoiceHelp, setShowVoiceHelp] = useState(false);

    useEffect(() => {
        // Notify server we are a spotter
        socket.emit('register-view', 'SPOTTER');

        return () => {
            socket.off('spotter-action');
        };
    }, []);

    const sendAction = useCallback((type: 'GOAL' | 'MISS' | 'TURNOVER' | 'FOUL' | 'PENALTY' | 'FREE_THROW' | 'TIMEOUT' | 'UNDO', teamId?: TeamId, playerId?: string) => {
        const action = {
            type,
            teamId,
            playerId,
            timestamp: Date.now()
        };

        socket.emit('spotter-action', action);

        // UI Feedback
        const teamName = teamId ? (teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name) : '';
        setFeedback(`${type} ${teamName}`);
        setTimeout(() => setFeedback(null), 1500);
    }, [matchState.homeTeam.name, matchState.awayTeam.name]);

    const handleVoiceCommand = useCallback((action: VoiceCommandAction) => {
        if (action.type === 'UNKNOWN') return;

        if (action.type === 'UNDO') {
            sendAction('UNDO');
            return;
        }

        if (action.type === 'TIMEOUT') {
            sendAction('TIMEOUT', action.team || 'HOME');
            return;
        }

        // Determine Team
        const teamId = action.team || 'HOME';
        const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;

        // Determine Player if number provided
        let playerId: string | undefined;
        if (action.playerNumber !== undefined) {
            const found = team.players.find(p => p.number === action.playerNumber);
            if (found) playerId = found.id;
        }

        sendAction(action.type as any, teamId, playerId);
    }, [matchState.homeTeam, matchState.awayTeam, sendAction]);

    const { isListening, toggleListening, transcript } = useVoiceCommands({
        onCommand: handleVoiceCommand,
        homeName: matchState.homeTeam.name,
        awayName: matchState.awayTeam.name
    });

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
                    <span className="font-bold text-lg">{t('matchTracker.goal')}</span>
                </button>

                <button
                    onClick={() => sendAction('MISS', teamId)}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <BadgeX size={32} className="mb-2" />
                    <span className="font-bold text-lg">{t('matchTracker.miss')}</span>
                </button>

                <button
                    onClick={() => sendAction('TURNOVER', teamId)}
                    className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <Activity size={32} className="mb-2" />
                    <span className="font-bold text-lg">{t('matchTracker.turnover')}</span>
                </button>

                <button
                    onClick={() => sendAction('FOUL', teamId)}
                    className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-xl flex flex-col items-center justify-center p-4 transition-all active:scale-95"
                >
                    <ShieldAlert size={32} className="mb-2" />
                    <span className="font-bold text-lg">{t('matchTracker.foul')}</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} data-testid="back-button" className="p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                        <Target className="text-indigo-500" /> {t('spotterInterface')}
                    </h1>
                    <p className="text-xs text-green-500 font-mono">Connected</p>
                </div>
                <button 
                    onClick={() => setShowVoiceHelp(!showVoiceHelp)}
                    data-testid="voice-help-button"
                    className="p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                >
                    <Info size={20} />
                </button>
            </div>

            {/* Voice Control Bar */}
            <div className="mb-6 max-w-4xl mx-auto w-full">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
                    <button
                        onClick={toggleListening}
                        className={`p-4 rounded-xl flex items-center gap-3 font-bold transition-all active:scale-95 w-full md:w-auto justify-center ${
                            isListening 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-indigo-600 text-white'
                        }`}
                    >
                        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                        {isListening ? t('spotter.stopVoice') : t('spotter.startVoice')}
                    </button>
                    
                    <div className="flex-1 w-full bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 min-h-[50px] flex items-center">
                        {isListening ? (
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-indigo-500 animate-bounce" />
                                <span className="text-gray-600 dark:text-gray-300 italic">
                                    {transcript || t('spotter.transcriptPlaceholder')}
                                </span>
                            </div>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-600">
                                {t('spotter.voiceControl')}
                            </span>
                        )}
                    </div>
                </div>

                {showVoiceHelp && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300 animate-in slide-in-from-top duration-300">
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <Info size={16} /> {t('spotter.helpText')}
                        </h4>
                        <ul className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                            <li>{t('spotter.helpExample1')}</li>
                            <li>{t('spotter.helpExample2')}</li>
                            <li>{t('spotter.helpExample3')}</li>
                        </ul>
                    </div>
                )}
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
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full shadow-xl font-bold animate-bounce z-[300]">
                    {t('spotter.commandRegistered')}: {feedback}
                </div>
            )}
        </div>
    );
};

export default SpotterView;
