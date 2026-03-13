import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { MatchState, Player } from '../types';
import { Trophy, CheckCircle2, AlertCircle, Users } from 'lucide-react';

const SpectatorVoting: React.FC = () => {
  const { t } = useTranslation();
  const [match, setMatch] = useState<MatchState | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [votedPlayerId, setVotedPlayerId] = useState<string | null>(localStorage.getItem('korfstat_voted_id'));
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin.replace('5173', '3002'));
    setSocket(newSocket);

    newSocket.emit('register-view', 'VOTING');

    newSocket.on('match-update', (state: MatchState) => setMatch(state));
    newSocket.on('vote-update', (v: Record<string, number>) => setVotes(v));
    newSocket.on('vote-error', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleVote = (playerId: string) => {
    if (votedPlayerId) return;
    socket.emit('vote-cast', playerId);
    setVotedPlayerId(playerId);
    localStorage.setItem('korfstat_voted_id', playerId);
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Waiting for live match...</p>
      </div>
    );
  }

  const allPlayers = [
    ...(match.homeTeam?.players || []),
    ...(match.awayTeam?.players || [])
  ].sort((a, b) => {
    // Sort by goals first, then name
    const aGoals = match.events?.filter(e => e.playerId === a.id && e.result === 'GOAL').length || 0;
    const bGoals = match.events?.filter(e => e.playerId === b.id && e.result === 'GOAL').length || 0;
    if (bGoals !== aGoals) return bGoals - aGoals;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-indigo-950 text-white p-4 pb-20">
      <header className="text-center mb-8 pt-4">
        <div className="inline-block p-3 bg-white/10 rounded-full mb-4">
          <Trophy className="text-yellow-400" size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-1">Goal of the Match</h1>
        <p className="text-indigo-200 text-sm">Cast your vote for the best performance!</p>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center gap-3 mb-6 animate-shake">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {votedPlayerId ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center border border-white/20 animate-in fade-in zoom-in slide-in-from-bottom-4">
          <CheckCircle2 className="text-green-400 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Vote Recorded!</h2>
          <p className="text-indigo-200 mb-6">Thank you for participating. Stay tuned for the results on the big screen!</p>
          <div className="inline-block px-4 py-2 bg-indigo-800 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-100">
            Current Leader: {allPlayers[0]?.name || '---'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
              <Users size={16} /> Players
            </h2>
            <span className="text-[10px] bg-indigo-800 px-2 py-1 rounded text-indigo-200 uppercase font-bold">Live Stats</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {allPlayers.map(player => {
              const goals = match.events?.filter(e => e.playerId === player.id && e.result === 'GOAL').length || 0;
              const isHome = match.homeTeam.players.some(p => p.id === player.id);
              
              return (
                <button
                  key={player.id}
                  onClick={() => handleVote(player.id)}
                  className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl p-4 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isHome ? 'bg-blue-600' : 'bg-red-600'}`}>
                      {player.number}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">{player.name}</div>
                      <div className="text-xs text-indigo-300">{isHome ? match.homeTeam.name : match.awayTeam.name}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-lg font-black text-indigo-200">{goals}</div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Goals</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-indigo-950/80 backdrop-blur-md border-t border-white/10 text-center">
        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
          Powered by KorfStat Pro Live Voting
        </p>
      </footer>
    </div>
  );
};

export default SpectatorVoting;
