import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchState, TeamId, Player, ShotType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import KorfballField from './KorfballField';
import PlayerProfileModal from './PlayerProfileModal';
import { Download, ArrowLeft, Home, FileSpreadsheet, ChevronDown, Video, EyeOff } from 'lucide-react';
import { generatePDF, generateJSON } from '../services/reportGenerator';
import { generateExcel } from '../services/excelGenerator';
import { generateMatchInsights } from '../services/analysisService';
import SocialGraphicGenerator from './SocialGraphicGenerator';
import { calculateMatchPlusMinus, calculatePlayerMatchStats } from '../utils/statsCalculator';
import { calculateLineupStats, formatTime as formatDuration, getTotalGoals } from '../utils/lineupUtils';
import ShotTimeline from './ShotTimeline';
import { Users, Clock } from 'lucide-react';

interface StatsViewProps {
  matchState: MatchState;
  savedMatches?: MatchState[];
  onBack: () => void;
  onHome?: () => void;
  onAnalyze?: () => void;
}

const StatsView: React.FC<StatsViewProps> = ({ matchState, savedMatches = [], onBack, onHome, onAnalyze }) => {
  const { t } = useTranslation();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showSocialGraphic, setShowSocialGraphic] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: Player, teamId: TeamId } | null>(null);

  // Filters
  const [filterPlayerId, setFilterPlayerId] = useState<string>('ALL');
  const [filterShotType, setFilterShotType] = useState<ShotType | 'ALL'>('ALL');
  const [heatmapMode, setHeatmapMode] = useState(true);
  const [showZoneStats, setShowZoneStats] = useState(false);
  const [showLineupStats, setShowLineupStats] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showOfficiating, setShowOfficiating] = useState(false);
  const [timeRange, setTimeRange] = useState({ start: 0, end: matchState.timer.elapsedSeconds });

  // Guard clause for missing data
  if (!matchState) return <div className="p-6 text-center">{t('stats.loading')}</div>;
  const events = matchState.events || [];

  // --- Derived Stats ---
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterPlayerId !== 'ALL' && e.playerId !== filterPlayerId) return false;
      if (filterShotType !== 'ALL' && e.shotType !== filterShotType) return false;
      if (e.timestamp < timeRange.start || e.timestamp > timeRange.end) return false;
      return true;
    });
  }, [events, filterPlayerId, filterShotType, timeRange]);

  const insights = useMemo(() => generateMatchInsights(matchState), [matchState]);

  // --- Plus/Minus Calculation ---
  const plusMinusMap = useMemo(() => calculateMatchPlusMinus(matchState), [matchState]);

  const getPlayerStats = (teamId: TeamId) => {
    const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    return calculatePlayerMatchStats(team, matchState, plusMinusMap);
  };

  const scoreData = useMemo(() => {
    let homeScore = 0;
    let awayScore = 0;
    const data = [{ time: '0:00', home: 0, away: 0, timestamp: 0 }];

    // Sort events by time
    const sortedEvents = [...events]
      .filter(e => e.type === 'SHOT' && e.result === 'GOAL')
      .sort((a, b) => a.timestamp - b.timestamp);

    sortedEvents.forEach(e => {
      if (e.teamId === 'HOME') homeScore++;
      else awayScore++;

      const m = Math.floor(e.timestamp / 60);
      const s = e.timestamp % 60;
      data.push({
        time: `${m}:${s.toString().padStart(2, '0')}`,
        home: homeScore,
        away: awayScore,
        timestamp: e.timestamp
      });
    });

    // Add current time point
    data.push({
      time: 'End',
      home: homeScore,
      away: awayScore,
      timestamp: 9999
    });

    return data;
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative z-50">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
              <ArrowLeft size={24} />
            </button>
            {onHome && (
              <button onClick={onHome} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400" title={t('home.returnToActive')}>
                <Home size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stats.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('stats.subtitle')}</p>
            </div>
          </div>

          <div className="flex gap-3 relative">
            {onAnalyze && (
              <button
                onClick={onAnalyze}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all font-medium"
              >
                <Video size={18} />
                {t('stats.videoAnalysis')}
              </button>
            )}

            <button
              onClick={() => setShowInsights(!showInsights)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium border ${showInsights ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700'}`}
            >
              <span>📊</span>
              {showInsights ? t('stats.hideInsights') : t('stats.showInsights')}
            </button>

            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-all font-medium"
            >
              <Download size={18} />
              {t('stats.export')}
              <ChevronDown size={16} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                <button
                  onClick={() => setShowSocialGraphic(true)}
                  className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400 font-bold border-b border-gray-100 dark:border-gray-700"
                >
                  <Video size={16} /> {t('stats.socialGraphic')}
                </button>
                <button
                  onClick={() => { generatePDF(matchState); setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700"
                >
                  <Download size={16} /> {t('stats.pdfReport')}
                </button>
                <button
                  onClick={() => { generateExcel(matchState); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-colors border-b border-gray-100 dark:border-gray-700"
                >
                  <FileSpreadsheet size={16} /> {t('stats.excelSpreadsheet')}
                </button>
                <button
                  onClick={() => { generateJSON(matchState); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-mono text-xs border border-current rounded px-1">JSON</div> {t('stats.rawData')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Deterministic Insights Section */}
        {showInsights && insights.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>📊</span>
              {t('stats.keyInsights')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${insight.type === 'POSITIVE' ? 'bg-green-50 border-green-100 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' :
                  insight.type === 'NEGATIVE' ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
                    'bg-gray-50 border-gray-100 text-gray-800 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-200'
                  }`}>
                  {insight.type === 'POSITIVE' ? <span>✅</span> :
                    insight.type === 'NEGATIVE' ? <span>⚠️</span> :
                      <span>ℹ️</span>}
                  <div>
                    <h4 className="font-bold text-sm">{insight.title}</h4>
                    <p className="text-xs opacity-90 mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 dark:text-gray-200">{t('stats.scoreProgression')}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1f2937' }}
                  />
                  <Legend />
                  <Line type="stepAfter" dataKey="home" name={matchState.homeTeam.name} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="stepAfter" dataKey="away" name={matchState.awayTeam.name} stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Shot Map - Heatmap Mode Enabled */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
            <h3 className="text-lg font-bold mb-4 dark:text-gray-200">{t('stats.shotAnalysis')}</h3>

            {/* Filters */}
            <div className="flex flex-col gap-2 mb-4">
              <select
                value={filterPlayerId}
                onChange={(e) => setFilterPlayerId(e.target.value)}
                className="p-2 border rounded text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <option value="ALL">{t('stats.allPlayers')}</option>
                {matchState.homeTeam.players.map(p => <option key={p.id} value={p.id}>{matchState.homeTeam.name} - #{p.number} {p.name}</option>)}
                {matchState.awayTeam.players.map(p => <option key={p.id} value={p.id}>{matchState.awayTeam.name} - #{p.number} {p.name}</option>)}
              </select>

              <select
                value={filterShotType}
                onChange={(e) => setFilterShotType(e.target.value as any)}
                className="p-2 border rounded text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <option value="ALL">{t('stats.allShotTypes')}</option>
                <option value="NEAR">{t('stats.near')}</option>
                <option value="MEDIUM">{t('stats.medium')}</option>
                <option value="FAR">{t('stats.far')}</option>
                <option value="PENALTY">{t('matchTracker.penalty')}</option>
                <option value="FREE_THROW">{t('matchTracker.freePass')}</option>
              </select>

              <div className="flex flex-wrap gap-2 text-sm mt-2">
                <button
                  onClick={() => { setHeatmapMode(false); setShowZoneStats(false); }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${!heatmapMode && !showZoneStats ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  {t('stats.precise')}
                </button>
                <button
                  onClick={() => { setHeatmapMode(true); setShowZoneStats(false); }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${heatmapMode && !showZoneStats ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  {t('stats.heatmap')}
                </button>
                <button
                  onClick={() => { setShowZoneStats(true); }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${showZoneStats ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  {t('stats.zoneWait')}
                </button>
                <button
                  onClick={() => setShowLineupStats(!showLineupStats)}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${showLineupStats ? 'bg-orange-100 text-orange-700 font-bold dark:bg-orange-900 dark:text-orange-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  <Users size={14} />
                  {t('stats.lineups')}
                </button>
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${showTimeline ? 'bg-blue-100 text-blue-700 font-bold dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  <Clock size={14} />
                  {t('stats.timeline')}
                </button>
                <button
                  onClick={() => { setShowOfficiating(!showOfficiating); if (!showOfficiating) { setHeatmapMode(false); setShowZoneStats(false); } }}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${showOfficiating ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                   <EyeOff size={14} /> Ref-Watch
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <KorfballField 
                mode="view" 
                events={showOfficiating ? events : filteredEvents} 
                heatmapMode={heatmapMode} 
                showZoneEfficiency={showZoneStats} 
                showOfficiating={showOfficiating}
                totalGoals={getTotalGoals(matchState)} 
              />
              
              {showTimeline && (
                <div className="w-full">
                  <ShotTimeline 
                    matchState={matchState}
                    startTime={timeRange.start}
                    endTime={timeRange.end}
                    onRangeChange={(start, end) => setTimeRange({ start, end })}
                  />
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-4 text-sm dark:text-gray-300">
              {showOfficiating ? (
                <>
                  <div className="flex items-center gap-1"><span className="text-green-500 font-bold">✓</span> Correct</div>
                  <div className="flex items-center gap-1"><span className="text-orange-500 font-bold">!</span> Debatable</div>
                  <div className="flex items-center gap-1"><span className="text-red-500 font-bold">✕</span> Incorrect</div>
                  <div className="flex items-center gap-1"><span className="text-gray-400 font-bold">○</span> Missed</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 opacity-50"></div> {t('stats.goal')}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 opacity-50"></div> {t('stats.miss')}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Player Stats Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Home Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className={`px-6 py-4 flex justify-between items-center ${matchState.homeTeam.color}`}>
              <h3 className="text-white font-bold text-lg">{matchState.homeTeam.name}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left dark:text-gray-300">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-center">G / S</th>
                    <th className="px-4 py-3 text-center">%</th>
                    <th className="px-4 py-3 text-center">Reb</th>
                    <th className="px-4 py-3 text-center">Foul</th>
                    <th className="px-4 py-3 text-center" title="Player Valuation Rating">VAL</th>
                    <th className="px-4 py-3 text-center" title="Plus / Minus">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {getPlayerStats('HOME').map(p => (
                    <tr
                      key={p.id}
                      className="border-b dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                      onClick={() => setSelectedPlayer({ player: p, teamId: 'HOME' })}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center text-xs font-bold">
                          {p.number}
                        </div>
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-center">{p.goals} / {p.shots}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{p.percentage}%</td>
                      <td className="px-4 py-3 text-center">{p.rebounds}</td>
                      <td className="px-4 py-3 text-center">{p.fouls}</td>
                      <td className={`px-4 py-3 text-center font-bold ${p.rating >= 15 ? 'text-green-600 dark:text-green-400' : p.rating < 5 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>{p.rating}</td>
                      <td className={`px-4 py-3 text-center font-mono font-bold ${p.plusMinus > 0 ? 'text-green-600 dark:text-green-400' : p.plusMinus < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>
                        {p.plusMinus > 0 ? '+' : ''}{p.plusMinus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Away Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className={`px-6 py-4 flex justify-between items-center ${matchState.awayTeam.color}`}>
              <h3 className="text-white font-bold text-lg">{matchState.awayTeam.name}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left dark:text-gray-300">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-center">G / S</th>
                    <th className="px-4 py-3 text-center">%</th>
                    <th className="px-4 py-3 text-center">Reb</th>
                    <th className="px-4 py-3 text-center">Foul</th>
                    <th className="px-4 py-3 text-center" title="Player Valuation Rating">VAL</th>
                    <th className="px-4 py-3 text-center" title="Plus / Minus">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {getPlayerStats('AWAY').map(p => (
                    <tr
                      key={p.id}
                      className="border-b dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors"
                      onClick={() => setSelectedPlayer({ player: p, teamId: 'AWAY' })}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 flex items-center justify-center text-xs font-bold">
                          {p.number}
                        </div>
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-center">{p.goals} / {p.shots}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600 dark:text-red-400">{p.percentage}%</td>
                      <td className="px-4 py-3 text-center">{p.rebounds}</td>
                      <td className="px-4 py-3 text-center">{p.fouls}</td>
                      <td className={`px-4 py-3 text-center font-bold ${p.rating >= 15 ? 'text-green-600 dark:text-green-400' : p.rating < 5 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>{p.rating}</td>
                      <td className={`px-4 py-3 text-center font-mono font-bold ${p.plusMinus > 0 ? 'text-green-600 dark:text-green-400' : p.plusMinus < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>
                        {p.plusMinus > 0 ? '+' : ''}{p.plusMinus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Lineup Stats Section */}
        {showLineupStats && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-900/30 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-orange-500 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Users size={20} />
                {t('stats.lineupAnalysis')}
              </h3>
              <p className="text-xs opacity-80">{t('stats.lineupDesc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left dark:text-gray-300">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3">{t('stats.team')}</th>
                    <th className="px-6 py-3">{t('stats.lineup')}</th>
                    <th className="px-6 py-3 text-center">{t('stats.duration')}</th>
                    <th className="px-6 py-3 text-center">{t('stats.goalsFor')}</th>
                    <th className="px-6 py-3 text-center">{t('stats.goalsAgainst')}</th>
                    <th className="px-6 py-3 text-center">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {calculateLineupStats(matchState).map((lineup, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold text-white ${lineup.teamId === 'HOME' ? 'bg-blue-600' : 'bg-red-600'}`}>
                          {lineup.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {lineup.playerNames.map((name, pIdx) => (
                            <span key={pIdx} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-600">
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono">{formatDuration(lineup.timePlayedSeconds)}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600 dark:text-green-400">{lineup.goalsFor}</td>
                      <td className="px-6 py-4 text-center font-bold text-red-600 dark:text-red-400">{lineup.goalsAgainst}</td>
                      <td className={`px-6 py-4 text-center font-black ${lineup.plusMinus > 0 ? 'text-green-600 dark:text-green-400' : lineup.plusMinus < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                        {lineup.plusMinus > 0 ? '+' : ''}{lineup.plusMinus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Player Profile Modal */}
        {selectedPlayer && (
          <PlayerProfileModal
            player={selectedPlayer.player}
            teamName={selectedPlayer.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}
            teamColor={selectedPlayer.teamId === 'HOME' ? matchState.homeTeam.color : matchState.awayTeam.color}
            events={matchState.events}
            savedMatches={savedMatches} 
            onClose={() => setSelectedPlayer(null)}
          />
        )}

      {showSocialGraphic && (
        <SocialGraphicGenerator
          matchState={matchState}
          onClose={() => setShowSocialGraphic(false)}
        />
      )}
      </div>
    </div>
  );
};

export default StatsView;