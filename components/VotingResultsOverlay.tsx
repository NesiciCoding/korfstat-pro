import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchState, Player } from '../types';
import { Trophy, Users, BarChart } from 'lucide-react';

interface VotingResultsOverlayProps {
  matchState: MatchState;
  votes: Record<string, number>;
  isVisible: boolean;
}

const VotingResultsOverlay: React.FC<VotingResultsOverlayProps> = ({ matchState, votes, isVisible }) => {
  const { t } = useTranslation();

  if (!isVisible) return null;

  const allPlayers = [
    ...(matchState.homeTeam?.players || []),
    ...(matchState.awayTeam?.players || [])
  ];

  const sortedVotes = Object.entries(votes)
    .map(([id, count]) => {
      const player = allPlayers.find(p => p.id === id);
      return { player, count };
    })
    .filter(item => item.player)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  const totalVotes = Object.values(votes).reduce((sum, n) => sum + n, 0);

  return (
    <div className="absolute inset-x-8 bottom-32 bg-black/80 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-in slide-in-from-bottom-20 duration-500 overflow-hidden z-50">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-400 rounded-2xl shadow-lg shadow-yellow-400/20">
              <Trophy className="text-black" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Goal of the Match</h2>
              <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs">Live Spectator Voting Results</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-white leading-none">{totalVotes}</div>
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Votes</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {sortedVotes.length > 0 ? (
            sortedVotes.map((item, index) => {
              const percentage = totalVotes > 0 ? (item.count / totalVotes) * 100 : 0;
              const isHome = matchState.homeTeam.players.some(p => p.id === item.player?.id);
              
              return (
                <div key={item.player?.id} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-black w-6 h-6 rounded flex items-center justify-center ${index === 0 ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
                        {index + 1}
                      </span>
                      <span className="text-xl font-bold text-white">{item.player?.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isHome ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isHome ? matchState.homeTeam.name : matchState.awayTeam.name}
                      </span>
                    </div>
                    <div className="text-xl font-black text-white">{percentage.toFixed(0)}%</div>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <div className="text-indigo-400 text-lg font-medium opacity-50">Waiting for first votes...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingResultsOverlay;
