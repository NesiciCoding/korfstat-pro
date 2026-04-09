import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchState } from '../types';
import { calculateCareerStats, getPlayerTrend } from '../utils/statsCalculator';
import { X, Trophy, Target, Activity, Calendar, Search, Users, TrendingUp, Star, Shield, Zap } from 'lucide-react';
import { ClubPlayer } from '../types/club';
import { PlayerArchetype } from '../types/stats';
import AchievementBadges from './AchievementBadges';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PlayerProfileProps {
    player: ClubPlayer;
    players?: ClubPlayer[]; // Added for comparison
    matches: MatchState[];
    onClose: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, players = [], matches, onClose }) => {
    const { t } = useTranslation();
    const [comparisonPlayerId, setComparisonPlayerId] = useState<string | null>(null);
    const [chartMetric, setChartMetric] = useState<'goals' | 'accuracy'>('goals');

    const stats = useMemo(() => calculateCareerStats(player.id, matches), [player.id, matches]);
    const trend = useMemo(() => getPlayerTrend(player.id, matches), [player.id, matches]);

    const comparisonPlayer = useMemo(() =>
        players.find(p => p.id === comparisonPlayerId),
    [comparisonPlayerId, players]);

    const comparisonTrend = useMemo(() =>
        comparisonPlayerId ? getPlayerTrend(comparisonPlayerId, matches) : [],
    [comparisonPlayerId, matches]);

    // Prepare chart data for both metrics and comparison
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
                [`${player.firstName}_goals`]: p1?.goals ?? 0,
                [`${player.firstName}_accuracy`]: p1?.accuracy ?? 0,
                [`${comparisonPlayer?.firstName || 'Comparison'}_goals`]: p2?.goals ?? 0,
                [`${comparisonPlayer?.firstName || 'Comparison'}_accuracy`]: p2?.accuracy ?? 0,
                fullDate: date
            };
        });
    }, [trend, comparisonTrend, player.firstName, comparisonPlayer?.firstName]);

    const recentMatches = trend.slice(-5).reverse();

    const ARCHETYPE_CONFIG: Record<PlayerArchetype, { label: string; description: string; color: string; icon: React.ReactNode }> = {
        SCORING_MACHINE: { label: t('playerProfile.archetype.SCORING_MACHINE'), description: t('playerProfile.archetype.SCORING_MACHINE_desc'), color: 'bg-rose-500/20 border-rose-400/30 text-rose-200', icon: <Target size={16} /> },
        IRON_WALL:       { label: t('playerProfile.archetype.IRON_WALL'),       description: t('playerProfile.archetype.IRON_WALL_desc'),       color: 'bg-slate-500/20 border-slate-400/30 text-slate-200', icon: <Shield size={16} /> },
        CLUTCH_PERFORMER:{ label: t('playerProfile.archetype.CLUTCH_PERFORMER'),description: t('playerProfile.archetype.CLUTCH_PERFORMER_desc'),color: 'bg-amber-500/20 border-amber-400/30 text-amber-200', icon: <Star size={16} /> },
        PLAYMAKER:       { label: t('playerProfile.archetype.PLAYMAKER'),       description: t('playerProfile.archetype.PLAYMAKER_desc'),       color: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200', icon: <Activity size={16} /> },
        RISING_STAR:     { label: t('playerProfile.archetype.RISING_STAR'),     description: t('playerProfile.archetype.RISING_STAR_desc'),     color: 'bg-cyan-500/20 border-cyan-400/30 text-cyan-200', icon: <TrendingUp size={16} /> },
        VERSATILE:       { label: t('playerProfile.archetype.VERSATILE'),       description: t('playerProfile.archetype.VERSATILE_desc'),       color: 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200', icon: <Users size={16} /> },
    };
    const archetypeConfig = ARCHETYPE_CONFIG[stats.archetype];

    const p1GoalsKey = `${player.firstName}_goals`;
    const p1AccKey = `${player.firstName}_accuracy`;
    const p2GoalsKey = `${comparisonPlayer?.firstName || 'Comparison'}_goals`;
    const p2AccKey = `${comparisonPlayer?.firstName || 'Comparison'}_accuracy`;
    const p1Key = chartMetric === 'goals' ? p1GoalsKey : p1AccKey;
    const p2Key = chartMetric === 'goals' ? p2GoalsKey : p2AccKey;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/10 flex flex-col md:flex-row animate-in zoom-in-95 duration-300">

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

                    <div className="relative z-10 text-center md:text-left flex flex-col h-full">
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

                        {/* Player Archetype */}
                        <div className="mt-auto pt-10">
                            <div className={`p-4 rounded-2xl border ${archetypeConfig.color} backdrop-blur-sm`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {archetypeConfig.icon}
                                    <span className="text-xs font-black uppercase tracking-widest">{archetypeConfig.label}</span>
                                </div>
                                <p className="text-xs opacity-70 leading-relaxed">{archetypeConfig.description}</p>
                            </div>
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

                        {/* Stats Summary Bento Grid — 6 cards (2 rows of 3) */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-indigo-500 transition-colors">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl w-fit mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Shield size={20} />
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.rebounds}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('playerProfile.rebounds')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group hover:border-violet-500 transition-colors">
                                <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-xl w-fit mb-4 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                                    <Zap size={20} />
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.careerRating}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t('playerProfile.careerRating')}</div>
                            </div>
                        </div>

                        {/* Advanced Stats Row — 3 mini-cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {/* H1/H2 Goal Split */}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                    {t('playerProfile.h1Goals')} / {t('playerProfile.h2Goals')}
                                </div>
                                <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    {stats.goalsFirstHalf} — {stats.goalsSecondHalf}
                                </div>
                                {stats.goals > 0 ? (
                                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <div
                                            className="bg-indigo-500 rounded-l-full"
                                            style={{ width: `${Math.round((stats.goalsFirstHalf / stats.goals) * 100)}%` }}
                                        />
                                        <div className="bg-indigo-300 dark:bg-indigo-700 flex-1 rounded-r-full" />
                                    </div>
                                ) : (
                                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
                                )}
                                <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
                                    <span>H1</span><span>H2</span>
                                </div>
                            </div>

                            {/* Career W/L/D record */}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('playerProfile.careerRecord')}</div>
                                <div className="flex gap-3 text-sm font-black mb-2">
                                    <span className="text-emerald-500">{stats.wins}W</span>
                                    <span className="text-gray-400">{stats.draws}D</span>
                                    <span className="text-rose-500">{stats.losses}L</span>
                                </div>
                                {stats.matchesPlayed > 0 ? (
                                    <div className="flex h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500" style={{ width: `${(stats.wins / stats.matchesPlayed) * 100}%` }} />
                                        <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${(stats.draws / stats.matchesPlayed) * 100}%` }} />
                                        <div className="bg-rose-500 flex-1" />
                                    </div>
                                ) : (
                                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
                                )}
                            </div>

                            {/* Career Plus/Minus */}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('stats.plusMinus', { defaultValue: '+/-' })}</div>
                                <div className={`text-3xl font-black ${stats.careerPlusMinus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {stats.careerPlusMinus > 0 ? '+' : ''}{stats.careerPlusMinus}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">Career net impact</div>
                            </div>
                        </div>

                        {/* Shot Type Breakdown */}
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                            <h3 className="font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Target className="text-indigo-500" size={18} /> {t('playerProfile.shotBreakdown')}
                            </h3>
                            <div className="space-y-3">
                                {(['PENALTY', 'FREE_THROW', 'RUNNING_IN', 'NEAR', 'MEDIUM', 'FAR'] as const).map(type => {
                                    const data = stats.shotsByType[type];
                                    if (data.shots === 0) return null;
                                    const acc = Math.round((data.goals / data.shots) * 100);
                                    const labelMap: Record<string, string> = {
                                        PENALTY: t('stats.penalty', { defaultValue: 'Penalty' }),
                                        FREE_THROW: t('stats.freePass', { defaultValue: 'Free Pass' }),
                                        RUNNING_IN: 'Running In',
                                        NEAR: t('stats.near', { defaultValue: 'Near' }),
                                        MEDIUM: t('stats.medium', { defaultValue: 'Medium' }),
                                        FAR: t('stats.far', { defaultValue: 'Far' }),
                                    };
                                    return (
                                        <div key={type} className="flex items-center gap-4">
                                            <div className="w-24 text-xs font-bold text-gray-500 shrink-0">{labelMap[type]}</div>
                                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${acc}%` }} />
                                            </div>
                                            <div className="text-xs font-mono font-bold text-gray-500 w-24 shrink-0 text-right">
                                                {data.goals}/{data.shots} ({acc}%)
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.values(stats.shotsByType).every(d => d.shots === 0) && (
                                    <p className="text-sm text-gray-400 italic">{t('clubManager.noHistory')}</p>
                                )}
                            </div>
                        </div>

                        {/* Personal Bests */}
                        {stats.bestMatch && stats.bestMatch.goals > 0 && (
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                                <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Trophy className="text-amber-500" size={18} /> {t('playerProfile.personalBest')}
                                </h3>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-1">{t('playerProfile.bestGame')}</div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.bestMatch.goals} {t('clubManager.goals', { defaultValue: 'goals' })}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            vs {stats.bestMatch.opponent}{stats.bestMatch.date ? ` · ${new Date(stats.bestMatch.date).toLocaleDateString()}` : ''}
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-1">{t('clubManager.accuracyRating')}</div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.bestMatch.accuracy}%</div>
                                        <div className="text-xs text-gray-500 mt-1">vs {stats.bestMatch.opponent}</div>
                                    </div>
                                    {stats.currentGoalStreak > 1 && (
                                        <div className="flex-1 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-1">Current Streak</div>
                                            <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.currentGoalStreak}</div>
                                            <div className="text-xs text-gray-500 mt-1">Consecutive matches scored</div>
                                        </div>
                                    )}
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
                                    <p className="text-xs text-gray-500 mt-1">
                                        {chartMetric === 'goals' ? 'Goal progression across matches' : 'Accuracy trend across matches'}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    {/* Metric toggle */}
                                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => setChartMetric('goals')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${chartMetric === 'goals' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}
                                        >
                                            {t('clubManager.goals', { defaultValue: 'Goals' })}
                                        </button>
                                        <button
                                            onClick={() => setChartMetric('accuracy')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${chartMetric === 'accuracy' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}
                                        >
                                            {t('clubManager.accuracy', { defaultValue: 'Accuracy' })}
                                        </button>
                                    </div>

                                    {/* Comparison select */}
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
                                            tickFormatter={chartMetric === 'accuracy' ? (v) => `${v}%` : undefined}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '20px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                padding: '12px 16px'
                                            }}
                                            formatter={(value) => chartMetric === 'accuracy' ? [`${value}%`] : [value]}
                                        />
                                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                        <Line
                                            type="monotone"
                                            dataKey={p1Key}
                                            name={player.firstName}
                                            stroke="#4f46e5"
                                            strokeWidth={4}
                                            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 8, strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                        {comparisonPlayerId && (
                                            <Line
                                                type="monotone"
                                                dataKey={p2Key}
                                                name={comparisonPlayer?.firstName || 'Comparison'}
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
                                                <th className="px-6 py-4 text-center">{t('playerProfile.rebounds')}</th>
                                                <th className="px-6 py-4 text-center">{t('playerProfile.careerRating')}</th>
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
                                                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-gray-500">
                                                        {match.accuracy}%
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-300">
                                                        {match.rebounds}
                                                    </td>
                                                    <td className={`px-6 py-4 text-center font-bold ${match.rating >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {match.rating > 0 ? '+' : ''}{match.rating}
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
