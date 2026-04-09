import React from 'react';
import { Clock } from 'lucide-react';
import { MatchState } from '../../types';
import { formatTime } from '../../utils/matchUtils';

interface MatchLogProps {
  matchState: MatchState;
}

const MatchLog: React.FC<MatchLogProps> = ({ matchState }) => (
  <div className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-160px)] transition-colors">
    <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
      <Clock size={16} /> Match Log
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {[...matchState.events].reverse().map(event => {
        const team = event.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        const player = team.players.find(p => p.id === event.playerId);
        return (
          <div
            key={event.id}
            className="text-xs p-2 rounded border-l-4 bg-gray-50 dark:bg-gray-700/50"
            style={{ borderLeftColor: team.color }}
          >
            <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
              <span>{formatTime(event.timestamp)}</span>
              <div className="text-right">
                <span className="font-bold">{event.type}</span>
                {event.type === 'SHOT' && (
                  <span className="ml-1 text-[10px] uppercase opacity-70">
                    {event.shotType === 'FREE_THROW' ? '(Free Pass)' : event.shotType === 'PENALTY' ? '(Penalty)' : ''}
                    {event.result === 'MISS' ? ' (MISS)' : ''}
                  </span>
                )}
              </div>
            </div>
            {player && <div className="dark:text-gray-200">{player.name}</div>}
            {event.type === 'CARD' && (
              <div className={`font-bold ${event.cardType === 'RED' ? 'text-red-600' : 'text-yellow-600'}`}>
                {event.cardType} CARD
              </div>
            )}
            {event.type === 'TIMEOUT' && (
              <div className="font-bold text-purple-600 dark:text-purple-400">TIMEOUT</div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default MatchLog;
