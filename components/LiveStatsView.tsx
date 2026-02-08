import React from 'react';
import { MatchState } from '../types';

interface LiveStatsViewProps {
    matchState: MatchState;
}

const LiveStatsView: React.FC<LiveStatsViewProps> = ({ matchState }) => {
    const getScore = (teamId: 'HOME' | 'AWAY') => matchState.events.filter(e => e.teamId === teamId && e.result === 'GOAL').length;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Scoreboard */}
            <div className="w-full max-w-7xl grid grid-cols-3 gap-8 items-center mb-16">
                {/* Home */}
                <div className="text-center">
                    <div className="text-4xl font-bold uppercase mb-4" style={{ color: matchState.homeTeam.color }}>{matchState.homeTeam.name}</div>
                    <div className="text-[12rem] font-black leading-none bg-zinc-900 rounded-3xl py-8 shadow-inner">{getScore('HOME')}</div>
                    {matchState.possession === 'HOME' && <div className="mt-4 text-3xl font-bold text-yellow-500 animate-pulse tracking-widest uppercase">POSSESSION</div>}
                </div>

                {/* Clock */}
                <div className="flex flex-col items-center justify-center">
                    <div className={`text-[8rem] font-mono font-bold leading-none mb-4 ${matchState.timer.isRunning ? 'text-green-500' : 'text-red-500'}`}>
                        {formatTime(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds))}
                    </div>

                    {/* Shot Clock */}
                    <div className={`text-6xl font-mono font-bold mb-4 ${matchState.shotClock.seconds <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                        {Math.ceil(matchState.shotClock.seconds)}
                    </div>

                    <div className="text-4xl font-bold text-gray-600 uppercase tracking-widest">Half {matchState.currentHalf}</div>
                    {matchState.timeout.isActive && (
                        <div className="mt-8 bg-purple-600 px-8 py-4 rounded-xl animate-pulse shadow-lg ring-4 ring-purple-400/30">
                            <span className="text-4xl font-bold">TIMEOUT {Math.ceil(matchState.timeout.remainingSeconds)}s</span>
                        </div>
                    )}
                </div>

                {/* Away */}
                <div className="text-center">
                    <div className="text-4xl font-bold uppercase mb-4" style={{ color: matchState.awayTeam.color }}>{matchState.awayTeam.name}</div>
                    <div className="text-[12rem] font-black leading-none bg-zinc-900 rounded-3xl py-8 shadow-inner">{getScore('AWAY')}</div>
                    {matchState.possession === 'AWAY' && <div className="mt-4 text-3xl font-bold text-yellow-500 animate-pulse tracking-widest uppercase">POSSESSION</div>}
                </div>
            </div>

            {/* Latest Events Ticker */}
            <div className="w-full max-w-7xl bg-zinc-900/50 backdrop-blur rounded-xl p-8 border border-zinc-800">
                <h3 className="text-2xl font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-4">
                    Latest Events
                    <div className="flex-1 h-px bg-zinc-800"></div>
                </h3>
                <div className="space-y-4">
                    {[...matchState.events].slice(-5).reverse().map(e => {
                        const team = e.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
                        const player = team.players.find(p => p.id === e.playerId);
                        return (
                            <div key={e.id} className="flex items-center text-3xl font-bold animate-in slide-in-from-left duration-300" style={{ color: team.color }}>
                                <span className="w-24 text-gray-500 font-mono text-2xl">{formatTime(e.timestamp)}</span>
                                <span className="w-48 text-white uppercase tracking-tighter">{e.type}</span>
                                <span className="flex-1 truncate">{player ? `#${player.number} ${player.name}` : ''} {e.shotType ? `(${e.shotType.replace('_', ' ')})` : ''}</span>
                                {e.result === 'GOAL' && <span className="text-green-500 animate-bounce">GOAL!</span>}
                            </div>
                        )
                    })}
                    {matchState.events.length === 0 && (
                        <div className="text-zinc-700 italic text-2xl text-center py-4">Waiting for match actions...</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveStatsView;