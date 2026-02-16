import React, { useMemo } from 'react';
import { MatchState } from '../types';
import { calculateCareerStats, getPlayerTrend } from '../utils/statsCalculator';
import { X, Trophy, Target, Activity, Calendar } from 'lucide-react';
import { ClubPlayer } from '../types/club';

interface PlayerProfileProps {
    player: ClubPlayer;
    matches: MatchState[];
    onClose: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, matches, onClose }) => {
    const stats = useMemo(() => calculateCareerStats(player.id, matches), [player.id, matches]);
    const trend = useMemo(() => getPlayerTrend(player.id, matches), [player.id, matches]);

    // Format trend for a simple chart or list
    const recentMatches = trend.slice(-5).reverse();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-indigo-600 p-6 rounded-t-2xl relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-3xl shadow-lg border-4 border-indigo-400">
                            {player.shirtNumber || '#'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{player.firstName} {player.lastName}</h2>
                            <div className="flex items-center gap-3 text-indigo-100 mt-1">
                                <span className="bg-indigo-500/50 px-2 py-0.5 rounded text-sm font-medium">{player.gender === 'M' ? 'Male' : 'Female'}</span>
                                <span className="text-sm">•</span>
                                <span className="text-sm opacity-90">{stats.matchesPlayed} Career Matches</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                <Target size={12} /> Goals
                            </div>
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.goals}</div>
                            <div className="text-xs text-gray-400">Total Scored</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                <Activity size={12} /> Accuracy
                            </div>
                            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.shootingPercentage}%</div>
                            <div className="text-xs text-gray-400">{stats.shots} Attempts</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                <Trophy size={12} /> Win Rate
                            </div>
                            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                {stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-400">{stats.wins}W - {stats.draws}D - {stats.losses}L</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                <Target size={12} /> Penalties
                            </div>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {stats.penalties.scored}/{stats.penalties.total}
                            </div>
                            <div className="text-xs text-gray-400">Converted</div>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar size={18} /> Recent Match Log
                    </h3>

                    {recentMatches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            No match history found.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Opponent</th>
                                        <th className="p-3 text-center">Result</th>
                                        <th className="p-3 text-right">Goals</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {recentMatches.map((match, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="p-3 font-medium text-gray-900 dark:text-white">vs {match.opponent}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${match.result === 'W' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        match.result === 'L' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {match.result}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {match.goals}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-center text-xs text-gray-500">
                    Stats are calculated from saved match history.
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
