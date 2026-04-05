import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchState } from '../types';
import { calculateCareerStats, getPlayerTrend } from '../utils/statsCalculator';
import { X, Trophy, Target, Activity, Calendar, Brain, Search, Users, Sparkles, TrendingUp, Star } from 'lucide-react';
import { ClubPlayer } from '../types/club';
import AchievementBadges from './AchievementBadges';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generatePlayerCareerBio } from '../services/geminiService';

interface PlayerProfileProps {
    player: ClubPlayer;
    players?: ClubPlayer[]; // Added for comparison
    matches: MatchState[];
    onClose: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, players = [], matches, onClose }) => {
    const { t } = useTranslation();
    const [comparisonPlayerId, setComparisonPlayerId] = useState<string | null>(null);
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);
    const [aiBio, setAiBio] = useState<string | null>(null);

    const stats = useMemo(() => calculateCareerStats(player.id, matches), [player.id, matches]);
    const trend = useMemo(() => getPlayerTrend(player.id, matches), [player.id, matches]);

    const comparisonPlayer = useMemo(() => 
        players.find(p => p.id === comparisonPlayerId), 
    [comparisonPlayerId, players]);

    const comparisonTrend = useMemo(() => 
        comparisonPlayerId ? getPlayerTrend(comparisonPlayerId, matches) : [], 
    [comparisonPlayerId, matches]);

    // Prepare chart data for comparison
    const chartData = useMemo(() => {
        const allDates = Array.from(new Set([
            ...trend.map(t => t.date),
            ...comparisonTrend.map(t => t.date)
        ])).sort((a, b) => a - b);

        return allDates.map(date => {
            const p1 = trend.find(t => t.date === date);
            const p2 = comparisonTrend.find(t => t.date === date);
            return {
                date: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                [player.firstName]: p1?.goals || 0,
                [comparisonPlayer?.firstName || 'Comparison']: p2?.goals || 0,
                fullDate: date
            };
        });
    }, [trend, comparisonTrend, player.firstName, comparisonPlayer?.firstName]);

    const handleGenerateBio = async () => {
        setIsGeneratingBio(true);
        try {
            const bio = await generatePlayerCareerBio(player, stats, trend);
            setAiBio(bio);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingBio(false);
        }
    };

    const recentMatches = trend.slice(-5).reverse();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10 flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

                {/* Left Sidebar: Profile & Identity */}
                <div className="w-full md:w-80 bg-gradient-to-b from-indigo-700 to-indigo-900 p-8 text-white relative overflow-hidden shrink-0">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>

                    <button
                        onClick={onClose}
                        aria-label={t('common.close')}
                        data-testid="player-profile-close-mobile"
                        className="absolute top-4 right-4 md:hidden text-white/70 hover:text-white bg-black/20 rounded-full p-2 transition-all"
                    >
                        <X size={20} />
                    </button>

                    <div className="relative z-10 text-center md:text-left">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl mx-auto md:mx-0 mb-6 flex items-center justify-center text-4xl font-black border-2 border-white/20 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                            {player.shirtNumber || '#'}
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2 leading-tight">
                            {player.firstName} <br />
                            <span className="text-indigo-200">{player.lastName}</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-4 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wider uppercase border border-white/10">
                                {player.gender === 'M' ? t('clubManager.male') : t('clubManager.female')}
                            </span>
                            <span className="px-3 py-1 bg-indigo-500/40 backdrop-blur-md rounded-full text-xs font-bold tracking-wider uppercase border border-white/10">
                                {t('clubManager.careerMatches', { count: stats.matchesPlayed })}
                            </span>
                        </div>

                        {/* Achievement Badges Section */}
                        <div className="mt-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-4 flex items-center gap-2">
                                <Trophy size={10} /> {t('stats.careerMilestones')}
                            </h4>
                            <div className="space-y-3">
                                <AchievementBadges milestones={stats.milestones} />
                                {stats.milestones.length === 0 && (
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-indigo-200/60 italic text-center">
                                        No milestones achieved yet. <br /> Continue tracking!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Bio Trigger */}
                        <div className="mt-auto pt-10">
                            <button
                                onClick={handleGenerateBio}
                                disabled={isGeneratingBio}
                                className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                            >
                                {isGeneratingBio ? (
                                    <div className="w-4 h-4 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Brain size={16} />
                                )}
                                {t('clubManager.generateAiBio')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Content: Stats & Trends */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        
                        {/* Summary Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="hidden md:block">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{t('clubManager.performanceOverview')}</h3>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Player Dashboard</h2>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label={t('common.close')}
                                data-testid="player-profile-close-desktop"
                                className="hidden md:flex text-gray-400 hover:text-gray-900 dark:hover:white p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Stats Summary Bento Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-indigo-500 transition-colors">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl w-fit mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Target size={20} />
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white" data-testid="career-goals">{stats.goals}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('clubManager.totalGoals')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-emerald-500 transition-colors">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl w-fit mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Activity size={20} />
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.shootingPercentage}%</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('clubManager.accuracyRating')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-amber-500 transition-colors">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl w-fit mb-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                    <Trophy size={20} />
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.wins}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('clubManager.careerWins')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-blue-500 transition-colors">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl w-fit mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                    <Star size={20} />
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.penalties.scored}/{stats.penalties.total}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('clubManager.penaltyRate')}</div>
                            </div>
                        </div>

                        {/* AI Bio Display */}
                        {aiBio && (
                            <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-900 rounded-3xl border border-indigo-100 dark:border-indigo-800 relative group animate-in slide-in-from-bottom-4">
                                <div className="absolute top-4 right-4 text-indigo-500 dark:text-indigo-400 animate-pulse">
                                    <Sparkles size={16} />
                                </div>
                                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Brain size={14} /> AI Career Analysis
                                </h4>
                                <div className="space-y-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line prose dark:prose-invert max-w-none">
                                    {aiBio}
                                </div>
                            </div>
                        )}

                        {/* Trend Chart with Comparison */}
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <TrendingUp className="text-indigo-500" /> Career Trajectory
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">Goal progression across matches</p>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="pl-3 text-gray-400">
                                        <Search size={14} />
                                    </div>
                                    <select
                                        value={comparisonPlayerId || ''}
                                        onChange={(e) => setComparisonPlayerId(e.target.value || null)}
                                        className="bg-transparent border-none text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-0 py-2 pr-8"
                                    >
                                        <option value="">Compare with Player...</option>
                                        {players
                                            .filter(p => p.id !== player.id)
                                            .map(p => (
                                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                                            ))
                                        }
                                    </select>
                                    {comparisonPlayerId && (
                                        <button 
                                            onClick={() => setComparisonPlayerId(null)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors mr-1"
                                        >
                                            <X size={12} className="text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="h-[280px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-10" />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#9ca3af" 
                                            tick={{ fontSize: 10, fontWeight: 600 }} 
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis 
                                            stroke="#9ca3af" 
                                            tick={{ fontSize: 10, fontWeight: 600 }} 
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ 
                                                borderRadius: '20px', 
                                                border: 'none', 
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                padding: '12px 16px'
                                            }}
                                        />
                                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                        <Line 
                                            type="monotone" 
                                            dataKey={player.firstName} 
                                            stroke="#4f46e5" 
                                            strokeWidth={4} 
                                            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                        {comparisonPlayerId && (
                                            <Line 
                                                type="monotone" 
                                                dataKey={comparisonPlayer?.firstName || 'Comparison'} 
                                                stroke="#f43f5e" 
                                                strokeWidth={3} 
                                                strokeDasharray="5 5"
                                                dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Match Log */}
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Calendar size={18} className="text-indigo-500" /> Recent Battles
                                </h3>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Past 5 Matches</div>
                            </div>

                            {recentMatches.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 italic">
                                    {t('clubManager.noHistory')}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4">{t('clubManager.opponent')}</th>
                                                <th className="px-6 py-4 text-center">{t('clubManager.result')}</th>
                                                <th className="px-6 py-4 text-center">{t('clubManager.accuracy')}</th>
                                                <th className="px-6 py-4 text-right pr-10">{t('clubManager.goals')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {recentMatches.map((match, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">vs {match.opponent}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${match.result === 'W' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                match.result === 'L' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                            }`}>
                                                            {match.result}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-12 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-indigo-500 rounded-full"
                                                                    style={{ width: `${match.accuracy}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="font-mono text-xs font-bold text-gray-500">{match.accuracy}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right pr-10 font-black text-indigo-600 dark:text-indigo-400 text-lg group-hover:scale-110 transition-transform">
                                                        {match.goals}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
