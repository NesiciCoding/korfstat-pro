import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchState, Player } from '../types';
import { TrainingSession } from '../types/training';
import { aggregateTrainingStats, correlatePerformance } from '../utils/trainingUtils';
import { ArrowLeft, Filter, TrendingUp, Target, Shield, Users, Activity, BarChart2, Zap, Info } from 'lucide-react';

interface OverallStatsProps {
  matches: MatchState[];
  onBack: () => void;
}

const OverallStats: React.FC<OverallStatsProps> = ({ matches, onBack }) => {
  const { t } = useTranslation();
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [insightPlayerId, setInsightPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'TRAINING'>('MATCHES');

  // Load Training Sessions
  const trainingSessions = useMemo<TrainingSession[]>(() => {
    const saved = localStorage.getItem('korfstat_training_sessions');
    return saved ? JSON.parse(saved) : [];
  }, []);

  // Extract unique team names
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    matches.forEach(m => {
      teams.add(m.homeTeam.name);
      teams.add(m.awayTeam.name);
    });
    return Array.from(teams).sort();
  }, [matches]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalMatches = 0;
    let totalGoals = 0;
    let totalShots = 0;
    let totalRebounds = 0;

    // Player Stats Map: key = playerName, value = aggregated stats
    const playerStatsMap = new Map<string, {
      name: string,
      team: string,
      matches: number,
      goals: number,
      shots: number,
      rebounds: number
    }>();

    matches.forEach(match => {
      const isHomeSelected = selectedTeam === 'ALL' || match.homeTeam.name === selectedTeam;
      const isAwaySelected = selectedTeam === 'ALL' || match.awayTeam.name === selectedTeam;

      if (!isHomeSelected && !isAwaySelected) return;

      if (isHomeSelected) totalMatches++;
      if (isAwaySelected && selectedTeam === 'ALL') {
      }

      // Wait, logic correction: If 'ALL', totalMatches is just matches.length. 
      // If 'Team A', matches where Team A played.

      //Iterate events to get accurate totals
      match.events.forEach(e => {
        const teamName = e.teamId === 'HOME' ? match.homeTeam.name : match.awayTeam.name;
        if (selectedTeam !== 'ALL' && teamName !== selectedTeam) return;

        if (e.type === 'SHOT') {
          totalShots++;
          if (e.result === 'GOAL') totalGoals++;
        }
        if (e.type === 'REBOUND') totalRebounds++;
      });

      // Player stats aggregation
      [match.homeTeam, match.awayTeam].forEach(team => {
        if (selectedTeam !== 'ALL' && team.name !== selectedTeam) return;

        team.players.forEach(p => {
          if (!playerStatsMap.has(p.name)) {
            playerStatsMap.set(p.name, { name: p.name, team: team.name, matches: 0, goals: 0, shots: 0, rebounds: 0 });
          }
          const stat = playerStatsMap.get(p.name)!;

          // Check if player actually played in this match (had an event or marked as starter/onField)
          const played = p.isStarter || match.events.some(e => e.playerId === p.id);
          if (played) stat.matches++;

          const pEvents = match.events.filter(e => e.playerId === p.id);
          const pShots = pEvents.filter(e => e.type === 'SHOT');
          const pGoals = pShots.filter(e => e.result === 'GOAL');
          const pRebounds = pEvents.filter(e => e.type === 'REBOUND');

          stat.shots += pShots.length;
          stat.goals += pGoals.length;
          stat.rebounds += pRebounds.length;
        });
      });
    });

    // Fix total matches count logic
    const matchCount = selectedTeam === 'ALL' ? matches.length : matches.filter(m => m.homeTeam.name === selectedTeam || m.awayTeam.name === selectedTeam).length;

    return {
      matchCount,
      totalGoals,
      totalShots,
      shotPercentage: totalShots > 0 ? Math.round((totalGoals / totalShots) * 100) : 0,
      totalRebounds,
      players: Array.from(playerStatsMap.values()).sort((a, b) => b.goals - a.goals)
    };
  }, [matches, selectedTeam]);

  // Aggregate Training Stats
  const trainingStats = useMemo(() => {
    const allKnownPlayers = matches.flatMap(m => [...m.homeTeam.players, ...m.awayTeam.players]);
    return aggregateTrainingStats(trainingSessions, allKnownPlayers);
  }, [trainingSessions, matches]);

  // Player Insights (Carry Over)
  const performanceInsight = useMemo(() => {
    if (!insightPlayerId) return null;
    return correlatePerformance(insightPlayerId, trainingStats, matches);
  }, [insightPlayerId, trainingStats, matches]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{activeTab === 'MATCHES' ? t('stats.overallTitle') : 'Training Performance'}</h1>
          </div>

          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <button 
              onClick={() => setActiveTab('MATCHES')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'MATCHES' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Matches
            </button>
            <button 
              onClick={() => setActiveTab('TRAINING')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TRAINING' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Training
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <Filter size={18} className="text-gray-400 ml-2" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer"
            >
              <option value="ALL">{t('stats.allTeams')}</option>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'MATCHES' ? (
          <>
            {/* High Level Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{t('stats.matchesPlayed')}</div>
                <div className="text-4xl font-black text-gray-900 dark:text-white">{stats.matchCount}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{t('stats.totalGoals')}</div>
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalGoals}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{t('stats.shotEfficiency')}</div>
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{stats.shotPercentage}%</div>
                <div className="text-xs text-gray-400 mt-1">{stats.totalGoals} / {stats.totalShots} {t('stats.shotAnalysis').toLowerCase().split(' ')[0]}s</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{t('stats.totalRebounds')}</div>
                <div className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.totalRebounds}</div>
              </div>
            </div>

            {/* Player Leaderboard */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2"><TrendingUp size={20} /> {t('stats.leaderboard')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-bold">
                    <tr>
                      <th className="px-6 py-3">{t('stats.player')}</th>
                      <th className="px-6 py-3">{t('matchSetup.teamName').split(' ')[0]}</th>
                      <th className="px-6 py-3 text-center">{t('clubManager.matches')}</th>
                      <th className="px-6 py-3 text-center">{t('clubManager.goals')}</th>
                      <th className="px-6 py-3 text-center">{t('stats.shotAnalysis').split(' ')[0]}s</th>
                      <th className="px-6 py-3 text-center">%</th>
                      <th className="px-6 py-3 text-center">{t('stats.rebounds')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stats.players.slice(0, 20).map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                          <span className="w-6 text-center text-gray-400 font-normal">{i + 1}</span>
                          {p.name}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.team}</td>
                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{p.matches}</td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{p.goals}</td>
                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{p.shots}</td>
                        <td className="px-6 py-4 text-center font-medium dark:text-gray-300">
                          {p.shots > 0 ? Math.round((p.goals / p.shots) * 100) : 0}%
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{p.rebounds}</td>
                      </tr>
                    ))}
                    {stats.players.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400 italic">{t('stats.noPlayerData')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Training High Level Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden relative">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Practice vs <span className="text-indigo-600">Reality</span></h3>
                      <div className="bg-indigo-50 dark:bg-indigo-900/40 p-3 rounded-2xl">
                         <Zap className="text-indigo-600 dark:text-indigo-400" size={24} />
                      </div>
                    </div>

                    {!insightPlayerId ? (
                      <div className="py-20 text-center space-y-4">
                        <Users className="mx-auto text-gray-300" size={48} />
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('stats.selectPlayerInsight', 'Select an athlete above to see performance delta')}</p>
                      </div>
                    ) : performanceInsight ? (
                      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border dark:border-gray-700">
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Practice Avg</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{Math.round(performanceInsight.trainingAvg)}%</div>
                            <p className="text-[10px] text-gray-500 mt-2 font-medium">From {performanceInsight.drillCount} recorded drills</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border dark:border-gray-700">
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Match Avg</div>
                            <div className="text-3xl font-black text-indigo-600">{Math.round(performanceInsight.matchAvg)}%</div>
                            <p className="text-[10px] text-gray-500 mt-2 font-medium">From {performanceInsight.matchShots} match shots</p>
                          </div>
                        </div>

                        <div className="relative pt-4">
                           <div className="flex justify-between items-end mb-2">
                              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Performance Delta</span>
                              <span className={`text-sm font-black ${performanceInsight.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {performanceInsight.delta >= 0 ? '+' : ''}{Math.round(performanceInsight.delta)}%
                              </span>
                           </div>
                           <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                              <div 
                                className={`h-full transition-all duration-1000 ${performanceInsight.delta >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, Math.abs(performanceInsight.delta) * 2)}%`, marginLeft: performanceInsight.delta >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(performanceInsight.delta) * 2)}%` }}
                              ></div>
                           </div>
                           <div className="flex justify-between mt-1 px-1">
                              <span className="text-[8px] font-black text-gray-400">PRACTICE HERO</span>
                              <span className="text-[8px] font-black text-gray-400">BIG GAME PLAYER</span>
                           </div>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex gap-4 items-start">
                           <Info className="text-amber-600 flex-shrink-0" size={20} />
                           <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                             {performanceInsight.delta > 10 ? 
                               `${performanceInsight.name} performs significantly better in match conditions. They thrive under pressure.` :
                               performanceInsight.delta < -10 ?
                               `${performanceInsight.name} has high practice numbers but struggles to translate this to matches. Consider mental preparation or higher-intensity drills.` :
                               `${performanceInsight.name} is a consistent performer. Their practice results are a reliable indicator of match success.`
                             }
                           </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Insufficient data for this athlete</p>
                      </div>
                    )}
                  </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Attendance</div>
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {trainingSessions.length > 0 ? Math.round(trainingSessions.reduce((acc, s) => acc + s.attendees.length, 0) / trainingSessions.length) : 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Drill Data Points</div>
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  {trainingSessions.reduce((acc, s) => acc + s.drillResults.length, 0)}
                </div>
              </div>
            </div>

            {/* Training Leaderboard */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2"><Users size={20} /> Athlete Commitment</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {trainingStats.map(stat => (
                      <button 
                        key={stat.playerId} 
                        onClick={() => setInsightPlayerId(stat.playerId)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          insightPlayerId === stat.playerId 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                          : 'bg-slate-50 dark:bg-slate-900 border-transparent text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${insightPlayerId === stat.playerId ? 'bg-white/20' : 'bg-white dark:bg-gray-800 text-indigo-600'}`}>
                            {stat.attendance}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-sm uppercase tracking-tight">{stat.name}</div>
                            <div className={`text-[10px] font-medium uppercase tracking-widest ${insightPlayerId === stat.playerId ? 'text-white/60' : 'text-gray-400'}`}>
                              Avg: {Math.round(stat.averageValue)}% • {stat.drillCount} Drills
                            </div>
                          </div>
                        </div>
                        <Activity size={16} className={insightPlayerId === stat.playerId ? 'text-white' : 'text-gray-400'} />
                      </button>
                    ))}
                    {trainingStats.length === 0 && (
                      <div className="col-span-full py-12 text-center text-gray-400 italic">No training data recorded yet. Record your first session in the Training Tracker!</div>
                    )}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OverallStats;