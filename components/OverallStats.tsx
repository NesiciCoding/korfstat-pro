import React, { useState, useMemo } from 'react';
import { MatchState, Player } from '../types';
import { ArrowLeft, Filter, TrendingUp, Target, Shield } from 'lucide-react';

interface OverallStatsProps {
  matches: MatchState[];
  onBack: () => void;
}

const OverallStats: React.FC<OverallStatsProps> = ({ matches, onBack }) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');

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
          // If viewing ALL, don't double count the match if both played (unlikely unless self-match)
          // Actually, if selectedTeam is ALL, match count is just match count. 
          // If selectedTeam is Specific, count matches where they played.
      } 
      
      // Since we iterate matches, if specific team selected, just +1. 
      // If ALL, just +1 per match. 
      // Wait, logic correction: If 'ALL', totalMatches is just matches.length. 
      // If 'Team A', matches where Team A played.
      
      // Let's iterate events to get accurate totals
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
            // Simplified: If in roster, assume +1 match for now, or check events. 
            // Better: Check if they have events or were starter.
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
      players: Array.from(playerStatsMap.values()).sort((a,b) => b.goals - a.goals)
    };
  }, [matches, selectedTeam]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Overall Statistics</h1>
            </div>
            
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <Filter size={18} className="text-gray-400 ml-2" />
                <select 
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="bg-transparent border-none text-gray-700 font-medium focus:ring-0 cursor-pointer"
                >
                    <option value="ALL">All Teams</option>
                    {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
        </div>

        {/* High Level Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Matches Played</div>
                <div className="text-4xl font-black text-gray-900">{stats.matchCount}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Goals</div>
                <div className="text-4xl font-black text-indigo-600">{stats.totalGoals}</div>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Shot Efficiency</div>
                <div className="text-4xl font-black text-emerald-600">{stats.shotPercentage}%</div>
                <div className="text-xs text-gray-400 mt-1">{stats.totalGoals} / {stats.totalShots} shots</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Rebounds</div>
                <div className="text-4xl font-black text-blue-600">{stats.totalRebounds}</div>
            </div>
        </div>

        {/* Player Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><TrendingUp size={20} /> Player Leaderboard</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                        <tr>
                            <th className="px-6 py-3">Player</th>
                            <th className="px-6 py-3">Team</th>
                            <th className="px-6 py-3 text-center">Matches</th>
                            <th className="px-6 py-3 text-center">Goals</th>
                            <th className="px-6 py-3 text-center">Shots</th>
                            <th className="px-6 py-3 text-center">%</th>
                            <th className="px-6 py-3 text-center">Rebounds</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {stats.players.slice(0, 20).map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                    <span className="w-6 text-center text-gray-400 font-normal">{i + 1}</span>
                                    {p.name}
                                </td>
                                <td className="px-6 py-4 text-gray-600">{p.team}</td>
                                <td className="px-6 py-4 text-center text-gray-600">{p.matches}</td>
                                <td className="px-6 py-4 text-center font-bold text-indigo-600">{p.goals}</td>
                                <td className="px-6 py-4 text-center text-gray-600">{p.shots}</td>
                                <td className="px-6 py-4 text-center font-medium">
                                    {p.shots > 0 ? Math.round((p.goals / p.shots) * 100) : 0}%
                                </td>
                                <td className="px-6 py-4 text-center text-gray-600">{p.rebounds}</td>
                            </tr>
                        ))}
                        {stats.players.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-400 italic">No player data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default OverallStats;