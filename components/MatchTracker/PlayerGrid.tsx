import React from 'react';
import { Shirt } from 'lucide-react';
import { MatchState, TeamId } from '../../types';
import { ContextMenuState } from './types';

interface PlayerGridProps {
  matchState: MatchState;
  onPlayerClick: (teamId: TeamId, playerId: string) => void;
}

const PlayerGrid: React.FC<PlayerGridProps> = ({ matchState, onPlayerClick }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto transition-colors">
    <div className="grid grid-cols-2 gap-6 h-full">
      {(['HOME', 'AWAY'] as TeamId[]).map(tId => {
        const team = tId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        return (
          <div key={tId} className="border-r last:border-0 border-gray-100 dark:border-gray-700 pr-2">
            <div className="flex items-center gap-2 mb-3 pb-1 border-b dark:border-gray-700" style={{ color: team.color }}>
              <Shirt size={16} fill={team.color} />
              <span className="text-sm font-bold uppercase">{team.name}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {team.players.filter(p => p.onField).map(p => (
                <button
                  key={p.id}
                  data-testid={`player-btn-${p.id}`}
                  onClick={() => onPlayerClick(tId, p.id)}
                  className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 text-xs py-2 rounded-lg flex flex-col items-center transition-colors min-h-[44px]"
                >
                  <span className="font-black text-sm">{p.number}</span>
                  <span className="text-[10px] text-gray-400">{p.gender}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PlayerGrid;
