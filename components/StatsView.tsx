import React, { useMemo, useState } from 'react';
import { MatchState, TeamId, Player, ShotType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import KorfballField from './KorfballField';
import PlayerProfileModal from './PlayerProfileModal';
import { Download, BrainCircuit, ArrowLeft, Loader2, Home } from 'lucide-react';
import { generateMatchReport } from '../services/geminiService';
import { generatePDF, generateJSON } from '../services/reportGenerator';

interface StatsViewProps {
  matchState: MatchState;
  onBack: () => void;
  onHome?: () => void;
}

const StatsView: React.FC<StatsViewProps> = ({ matchState, onBack, onHome }) => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: Player, teamId: TeamId } | null>(null);

  // Filters
  const [filterPlayerId, setFilterPlayerId] = useState<string>('ALL');
  const [filterShotType, setFilterShotType] = useState<ShotType | 'ALL'>('ALL');
  const [heatmapMode, setHeatmapMode] = useState(true);
  const [showZoneStats, setShowZoneStats] = useState(false);

  // --- Derived Stats ---
  const filteredEvents = useMemo(() => {
    return matchState.events.filter(e => {
      if (filterPlayerId !== 'ALL' && e.playerId !== filterPlayerId) return false;
      if (filterShotType !== 'ALL' && e.shotType !== filterShotType) return false;
      return true;
    });
  }, [matchState.events, filterPlayerId, filterShotType]);

  // --- Plus/Minus Calculation ---
  // We need to replay events to know who was on field at time of goal
  const plusMinusMap = new Map<string, number>();

  // Initialize starting lineups
  const currentHomeLineup = new Set<string>();
  const currentAwayLineup = new Set<string>();

  matchState.homeTeam.players.forEach(p => { if (p.isStarter) currentHomeLineup.add(p.id); plusMinusMap.set(p.id, 0); });
  matchState.awayTeam.players.forEach(p => { if (p.isStarter) currentAwayLineup.add(p.id); plusMinusMap.set(p.id, 0); });

  // Chronological Replay
  const sortedEvents = [...matchState.events].sort((a, b) => a.timestamp - b.timestamp);

  sortedEvents.forEach(e => {
    if (e.type === 'SUBSTITUTION' && e.subInId && e.subOutId) {
      // Update Lineups
      if (e.teamId === 'HOME') {
        currentHomeLineup.delete(e.subOutId);
        currentHomeLineup.add(e.subInId);
        // Ensure new player has entry in map if not present (though should be initialized above if we iterate all players)
        if (!plusMinusMap.has(e.subInId)) plusMinusMap.set(e.subInId, 0);
      } else {
        currentAwayLineup.delete(e.subOutId);
        currentAwayLineup.add(e.subInId);
        if (!plusMinusMap.has(e.subInId)) plusMinusMap.set(e.subInId, 0);
      }
    }

    if (e.type === 'SHOT' && e.result === 'GOAL') {
      if (e.teamId === 'HOME') {
        // Home Goal: +1 for Home lineup, -1 for Away lineup
        currentHomeLineup.forEach(pid => plusMinusMap.set(pid, (plusMinusMap.get(pid) || 0) + 1));
        currentAwayLineup.forEach(pid => plusMinusMap.set(pid, (plusMinusMap.get(pid) || 0) - 1));
      } else {
        // Away Goal: +1 for Away lineup, -1 for Home lineup
        currentAwayLineup.forEach(pid => plusMinusMap.set(pid, (plusMinusMap.get(pid) || 0) + 1));
        currentHomeLineup.forEach(pid => plusMinusMap.set(pid, (plusMinusMap.get(pid) || 0) - 1));
      }
    }
  });

  const getPlayerStats = (teamId: TeamId) => {
    const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    return team.players.map(player => {
      const events = matchState.events.filter(e => e.playerId === player.id);
      const shots = events.filter(e => e.type === 'SHOT');
      const goals = shots.filter(e => e.result === 'GOAL');
      const rebounds = events.filter(e => e.type === 'REBOUND');
      const fouls = events.filter(e => e.type === 'FOUL');
      const turnovers = events.filter(e => e.type === 'TURNOVER');

      // Calculate Rating (VAL)
      // Formula: (Goals * 5) + (Rebounds * 2) - (Misses * 1) - (Turnovers * 3) - (Fouls * 2)
      const misses = shots.length - goals.length;
      const rating = (goals.length * 5) + (rebounds.length * 2) - (misses * 1) - (turnovers.length * 3) - (fouls.length * 2);

      return {
        ...player,
        shots: shots.length,
        goals: goals.length,
        percentage: shots.length > 0 ? Math.round((goals.length / shots.length) * 100) : 0,
        rebounds: rebounds.length,
        fouls: fouls.length,
        rating: rating,
        plusMinus: plusMinusMap.get(player.id) || 0,
        shotTypes: {
          short: shots.filter(s => s.shotType === 'NEAR').length,
          medium: shots.filter(s => s.shotType === 'MEDIUM').length,
          long: shots.filter(s => s.shotType === 'FAR').length,
          pen: shots.filter(s => s.shotType === 'PENALTY' || s.shotType === 'FREE_THROW').length,
        }
      };
    }).sort((a, b) => b.rating - a.rating);
  };

  const scoreData = useMemo(() => {
    let homeScore = 0;
    let awayScore = 0;
    const data = [{ time: '0:00', home: 0, away: 0, timestamp: 0 }];

    // Sort events by time
    const sortedEvents = [...matchState.events]
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
  }, [matchState.events]);

  const handleGenerateReport = async () => {
    setIsLoadingAi(true);
    const report = await generateMatchReport(matchState);
    setAiReport(report);
    setIsLoadingAi(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
              <ArrowLeft size={24} />
            </button>
            {onHome && (
              <button onClick={onHome} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400" title="Back to Home">
                <Home size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Match Statistics</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Detailed breakdown and analysis</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={isLoadingAi}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isLoadingAi ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
              Match Analysis
            </button>
            <button
              onClick={() => generatePDF(matchState)}
              className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Download size={18} /> Export PDF
            </button>
            <button
              onClick={() => generateJSON(matchState)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Download size={18} /> Export JSON
            </button>
          </div>
        </div>

        {/* AI Report Section */}
        {aiReport && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 ring-4 ring-purple-50 dark:ring-purple-900/20">
            <h2 className="text-xl font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
              <BrainCircuit size={24} /> Match Insights
            </h2>
            <div className="prose prose-purple dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {aiReport}
            </div>
          </div>
        )}

        {/* Score Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 dark:text-gray-200">Score Progression</h3>
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
            <h3 className="text-lg font-bold mb-4 dark:text-gray-200">Shot Analysis</h3>

            {/* Filters */}
            <div className="flex flex-col gap-2 mb-4">
              <select
                value={filterPlayerId}
                onChange={(e) => setFilterPlayerId(e.target.value)}
                className="p-2 border rounded text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <option value="ALL">All Players</option>
                {matchState.homeTeam.players.map(p => <option key={p.id} value={p.id}>{matchState.homeTeam.name} - #{p.number} {p.name}</option>)}
                {matchState.awayTeam.players.map(p => <option key={p.id} value={p.id}>{matchState.awayTeam.name} - #{p.number} {p.name}</option>)}
              </select>

              <select
                value={filterShotType}
                onChange={(e) => setFilterShotType(e.target.value as any)}
                className="p-2 border rounded text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <option value="ALL">All Shot Types</option>
                <option value="NEAR">Near</option>
                <option value="MEDIUM">Medium</option>
                <option value="FAR">Long</option>
                <option value="PENALTY">Penalty</option>
                <option value="FREE_THROW">Free Pass</option>
              </select>

              <div className="flex gap-2 text-sm mt-2">
                <button
                  onClick={() => { setHeatmapMode(false); setShowZoneStats(false); }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${!heatmapMode && !showZoneStats ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  Precise
                </button>
                <button
                  onClick={() => { setHeatmapMode(true); setShowZoneStats(false); }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${heatmapMode && !showZoneStats ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  Heatmap
                </button>
                <button
                  onClick={() => { setShowZoneStats(true); }}
                  className={`px-3 py-1.5 rounded-md transition-colors ${showZoneStats ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'}`}
                >
                  Zone Efficiency
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center">
              <KorfballField mode="view" events={filteredEvents} heatmapMode={heatmapMode} showZoneEfficiency={showZoneStats} />
            </div>
            <div className="mt-4 flex justify-center gap-4 text-sm dark:text-gray-300">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 opacity-50"></div> Goal</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 opacity-50"></div> Miss</div>
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

        {/* Player Profile Modal */}
        {selectedPlayer && (
          <PlayerProfileModal
            player={selectedPlayer.player}
            teamName={selectedPlayer.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}
            teamColor={selectedPlayer.teamId === 'HOME' ? matchState.homeTeam.color : matchState.awayTeam.color}
            events={matchState.events}
            onClose={() => setSelectedPlayer(null)}
          />
        )}

      </div>
    </div>
  );
};

export default StatsView;