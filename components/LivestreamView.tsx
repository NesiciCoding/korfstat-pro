import React, { useState, useMemo } from 'react';
import { MatchState, Player, ShotType, TeamId } from '../types';
import KorfballField from './KorfballField';
import { TrendingUp, Target, History, Filter } from 'lucide-react';

interface LivestreamViewProps {
    matchState: MatchState;
    savedMatches: MatchState[];
}

type ViewTab = 'HEATMAP' | 'CURRENT_STATS' | 'HISTORIC_STATS';

const LivestreamView: React.FC<LivestreamViewProps> = ({ matchState, savedMatches }) => {
    const [activeTab, setActiveTab] = useState<ViewTab>('HEATMAP');

    // --- HEATMAP STATE ---
    const [filterPlayerId, setFilterPlayerId] = useState<string>('ALL');
    const [filterShotType, setFilterShotType] = useState<ShotType | 'ALL'>('ALL');
    const [heatmapMode, setHeatmapMode] = useState(true);

    // --- DERIVED DATA ---

    // 1. Heatmap Events
    const filteredEvents = useMemo(() => {
        return matchState.events.filter(e => {
            if (filterPlayerId !== 'ALL' && e.playerId !== filterPlayerId) return false;
            if (filterShotType !== 'ALL' && e.shotType !== filterShotType) return false;
            return true;
        });
    }, [matchState.events, filterPlayerId, filterShotType]);

    // 2. Current Match Player Stats
    const getCurrentPlayerStats = (teamId: TeamId) => {
        const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        return team.players.map(player => {
            const events = matchState.events.filter(e => e.playerId === player.id);
            const shots = events.filter(e => e.type === 'SHOT');
            const goals = shots.filter(e => e.result === 'GOAL');
            const rebounds = events.filter(e => e.type === 'REBOUND');
            const fouls = events.filter(e => e.type === 'FOUL');

            return {
                ...player,
                shots: shots.length,
                goals: goals.length,
                percentage: shots.length > 0 ? Math.round((goals.length / shots.length) * 100) : 0,
                rebounds: rebounds.length,
                fouls: fouls.length
            };
        }).sort((a, b) => b.goals - a.goals);
    };

    // 3. Historic Player Stats (Only for players in CURRENT match)
    const historicStats = useMemo(() => {
        const currentPlayers = [...matchState.homeTeam.players, ...matchState.awayTeam.players];
        const playerMap = new Map<string, {
            name: string,
            teamName: string, // Current team
            matches: number,
            goals: number,
            shots: number,
            rebounds: number
        }>();

        // Initialize with current players
        currentPlayers.forEach(p => {
            // Use Name as key since ID might change between matches if not persisted perfectly
            // Ideally ID is consistent? If not, Name is safer for "Same Player Different Match" heuristic
            const key = p.name;
            const teamName = matchState.homeTeam.players.find(hp => hp.id === p.id) ? matchState.homeTeam.name : matchState.awayTeam.name;
            playerMap.set(key, { name: p.name, teamName, matches: 0, goals: 0, shots: 0, rebounds: 0 });
        });

        // Aggregate from History
        savedMatches.forEach(m => {
            [m.homeTeam, m.awayTeam].forEach(t => {
                t.players.forEach(p => {
                    if (playerMap.has(p.name)) {
                        const stat = playerMap.get(p.name)!;
                        const played = p.isStarter || m.events.some(e => e.playerId === p.id); // Simple check
                        if (played) stat.matches++;

                        const pEvents = m.events.filter(e => e.playerId === p.id);
                        stat.shots += pEvents.filter(e => e.type === 'SHOT').length;
                        stat.goals += pEvents.filter(e => e.type === 'SHOT' && e.result === 'GOAL').length;
                        stat.rebounds += pEvents.filter(e => e.type === 'REBOUND').length;
                    }
                });
            });
        });

        // Add CURRENT match stats too? 
        // User likely wants "Historic" to include "Career including current"?
        // Or just "Previous"?
        // Usually "Season Stats" includes current game live.
        // Let's add current match stats to the history aggregation.
        [matchState.homeTeam, matchState.awayTeam].forEach(t => {
            t.players.forEach(p => {
                if (playerMap.has(p.name)) {
                    const stat = playerMap.get(p.name)!;
                    // Current match is always "played" if they are in roster? 
                    // Or if they are on field/have events?
                    // Let's assume +1 match if they exist in current state (active match)
                    stat.matches++;

                    const pEvents = matchState.events.filter(e => e.playerId === p.id);
                    stat.shots += pEvents.filter(e => e.type === 'SHOT').length;
                    stat.goals += pEvents.filter(e => e.type === 'SHOT' && e.result === 'GOAL').length;
                    stat.rebounds += pEvents.filter(e => e.type === 'REBOUND').length;
                }
            });
        });

        return Array.from(playerMap.values()).sort((a, b) => b.goals - a.goals);
    }, [matchState, savedMatches]);


    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            {/* Header / Tabs */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-4">
                    <div className="text-xl font-black italic tracking-tighter text-indigo-400">LIVESTREAM STATS</div>
                    <div className="h-8 w-px bg-slate-600 mx-2"></div>
                    <div className="text-sm font-bold text-slate-400">
                        {matchState.homeTeam.name} vs {matchState.awayTeam.name}
                    </div>
                </div>

                <div className="flex bg-slate-900 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setActiveTab('HEATMAP')}
                        className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'HEATMAP' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        <Target size={16} /> Shot Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('CURRENT_STATS')}
                        className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'CURRENT_STATS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        <TrendingUp size={16} /> Current Match
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORIC_STATS')}
                        className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'HISTORIC_STATS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        <History size={16} /> Historic / Career
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">

                {/* 1. HEATMAP VIEW */}
                {activeTab === 'HEATMAP' && (
                    <div className="absolute inset-0 flex flex-col lg:flex-row p-6 gap-6 animate-in fade-in duration-300">
                        {/* Controls Sidebar */}
                        <div className="w-full lg:w-64 bg-slate-800 rounded-xl p-4 border border-slate-700 h-fit">
                            <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-4 flex items-center gap-2"><Filter size={14} /> Filters</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Player</label>
                                    <select
                                        value={filterPlayerId}
                                        onChange={(e) => setFilterPlayerId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="ALL">All Players</option>
                                        <optgroup label={matchState.homeTeam.name}>
                                            {matchState.homeTeam.players.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                                        </optgroup>
                                        <optgroup label={matchState.awayTeam.name}>
                                            {matchState.awayTeam.players.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                                        </optgroup>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Shot Type</label>
                                    <select
                                        value={filterShotType}
                                        onChange={(e) => setFilterShotType(e.target.value as any)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="ALL">All Types</option>
                                        <option value="NEAR">Short</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="FAR">Long</option>
                                        <option value="PENALTY">Penalty</option>
                                        <option value="FREE_THROW">Free Pass</option>
                                    </select>
                                </div>

                                <div className="flex bg-slate-900 p-1 rounded">
                                    <button onClick={() => setHeatmapMode(true)} className={`flex-1 py-1.5 text-xs font-bold rounded ${heatmapMode ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Heatmap</button>
                                    <button onClick={() => setHeatmapMode(false)} className={`flex-1 py-1.5 text-xs font-bold rounded ${!heatmapMode ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Precise</button>
                                </div>
                            </div>
                        </div>

                        {/* Field */}
                        <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-700 overflow-hidden relative flex items-center justify-center p-4">
                            {/* Using white bg for field because KorfballField is light-themed usually, or ensure it handles dark mode? 
                          Field usually has white background in code. Let's keep container white for contrast.*/}
                            <KorfballField mode="view" events={filteredEvents} heatmapMode={heatmapMode} />
                        </div>
                    </div>
                )}

                {/* 2. CURRENT STATS VIEW */}
                {activeTab === 'CURRENT_STATS' && (
                    <div className="absolute inset-0 overflow-y-auto p-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                            {['HOME', 'AWAY'].map(teamId => {
                                const isHome = teamId === 'HOME';
                                const team = isHome ? matchState.homeTeam : matchState.awayTeam;
                                const stats = getCurrentPlayerStats(teamId as TeamId);

                                return (
                                    <div key={teamId} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                                        <div className="p-4 border-b border-slate-700 flex justify-between items-center" style={{ borderLeft: `6px solid ${team.color}` }}>
                                            <h3 className="font-bold text-xl">{team.name}</h3>
                                            <span className="text-slate-500 text-sm font-bold">CURRENT MATCH</span>
                                        </div>
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-900/50 text-slate-400 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3"># Name</th>
                                                    <th className="px-4 py-3 text-center">G / S</th>
                                                    <th className="px-4 py-3 text-center">%</th>
                                                    <th className="px-4 py-3 text-center">Reb</th>
                                                    <th className="px-4 py-3 text-center">Foul</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {stats.map(p => (
                                                    <tr key={p.id} className="hover:bg-slate-700/50 transition-colors">
                                                        <td className="px-4 py-3 font-bold">
                                                            <span className="inline-block w-6 text-slate-500">{p.number}</span>
                                                            {p.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-slate-300 font-mono">
                                                            <span className="text-white font-bold">{p.goals}</span> / {p.shots}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold">
                                                            <span className={`${p.percentage >= 25 ? 'text-green-400' : p.percentage >= 15 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                                {p.percentage}%
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-slate-300">{p.rebounds}</td>
                                                        <td className="px-4 py-3 text-center text-slate-300">{p.fouls}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. HISTORIC STATS VIEW */}
                {activeTab === 'HISTORIC_STATS' && (
                    <div className="absolute inset-0 overflow-y-auto p-6 animate-in fade-in duration-300">
                        <div className="max-w-5xl mx-auto bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                            <div className="p-6 border-b border-slate-700 bg-slate-900/30">
                                <h3 className="font-bold text-2xl text-indigo-400 mb-1">Career Statistics</h3>
                                <p className="text-slate-400 text-sm">Aggregated stats for players currently on the roster (including this match)</p>
                            </div>

                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Player</th>
                                        <th className="px-6 py-4">Team</th>
                                        <th className="px-6 py-4 text-center">Matches</th>
                                        <th className="px-6 py-4 text-center">Goals</th>
                                        <th className="px-6 py-4 text-center">Shots</th>
                                        <th className="px-6 py-4 text-center">Efficiency</th>
                                        <th className="px-6 py-4 text-center">Rebounds</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700 font-medium">
                                    {historicStats.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                                                <div className="w-6 text-center text-slate-600 text-xs">{i + 1}</div>
                                                {p.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">{p.teamName}</td>
                                            <td className="px-6 py-4 text-center text-slate-300">{p.matches}</td>
                                            <td className="px-6 py-4 text-center font-bold text-indigo-400 text-lg">{p.goals}</td>
                                            <td className="px-6 py-4 text-center text-slate-400">{p.shots}</td>
                                            <td className="px-6 py-4 text-center">
                                                {p.shots > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`${(p.goals / p.shots) >= 0.25 ? 'text-green-400' : 'text-slate-300'}`}>
                                                            {Math.round((p.goals / p.shots) * 100)}%
                                                        </span>
                                                        {/* Simple bar for visual */}
                                                        <div className="w-16 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-500"
                                                                style={{ width: `${Math.min(100, (p.goals / p.shots) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center text-blue-400">{p.rebounds}</td>
                                        </tr>
                                    ))}
                                    {historicStats.length === 0 && (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">No historic data found for current players</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LivestreamView;
