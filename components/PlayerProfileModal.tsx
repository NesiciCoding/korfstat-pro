import React from 'react';
import { Player, MatchEvent, TeamId, SHOT_TYPES } from '../types';
import KorfballField from './KorfballField';
import { X, Target, Shield, AlertTriangle, Trophy } from 'lucide-react';

interface PlayerProfileModalProps {
  player: Player;
  teamName: string;
  teamColor: string;
  events: MatchEvent[];
  onClose: () => void;
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, teamName, teamColor, events, onClose }) => {
  // Aggregate stats
  const playerEvents = events.filter(e => e.playerId === player.id);
  const shots = playerEvents.filter(e => e.type === 'SHOT');
  const goals = shots.filter(e => e.result === 'GOAL');
  const rebounds = playerEvents.filter(e => e.type === 'REBOUND');
  const fouls = playerEvents.filter(e => e.type === 'FOUL');

  const shotPercentage = shots.length > 0 ? Math.round((goals.length / shots.length) * 100) : 0;

  // Breakdown by shot type
  const typeStats = SHOT_TYPES.map(type => {
    const typeShots = shots.filter(s => s.shotType === type.value);
    const typeGoals = typeShots.filter(s => s.result === 'GOAL');
    return {
      label: type.label,
      attempts: typeShots.length,
      goals: typeGoals.length,
      pct: typeShots.length > 0 ? Math.round((typeGoals.length / typeShots.length) * 100) : 0
    };
  }).filter(s => s.attempts > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-in fade-in zoom-in duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Left Sidebar: Profile Info */}
        <div className={`w-full md:w-1/3 p-6 text-white ${teamColor.includes('red') ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
           <div className="flex justify-between items-start mb-6 md:mb-10">
             <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
               <span className="text-xs font-bold uppercase tracking-wider opacity-90">KorfStat Profile</span>
             </div>
             <button onClick={onClose} className="md:hidden text-white/80 hover:text-white">
               <X size={24} />
             </button>
           </div>
           
           <div className="text-center mb-8">
             <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold border-4 border-white/30">
               {player.number}
             </div>
             <h2 className="text-3xl font-bold mb-1">{player.name}</h2>
             <p className="opacity-90 font-medium">{teamName}</p>
             <div className="mt-4 inline-block px-3 py-1 bg-white/20 rounded-full text-sm">
               {player.isStarter ? 'Starter' : 'Substitute'}
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4 text-center">
             <div className="bg-black/20 p-3 rounded-lg">
               <div className="text-2xl font-bold">{goals.length}</div>
               <div className="text-xs uppercase opacity-70">Goals</div>
             </div>
             <div className="bg-black/20 p-3 rounded-lg">
               <div className="text-2xl font-bold">{shots.length}</div>
               <div className="text-xs uppercase opacity-70">Shots</div>
             </div>
             <div className="bg-black/20 p-3 rounded-lg">
               <div className="text-2xl font-bold">{rebounds.length}</div>
               <div className="text-xs uppercase opacity-70">Rebounds</div>
             </div>
             <div className="bg-black/20 p-3 rounded-lg">
               <div className="text-2xl font-bold">{fouls.length}</div>
               <div className="text-xs uppercase opacity-70">Fouls</div>
             </div>
           </div>
           
           {/* Mock Historical Stats */}
           <div className="mt-8 border-t border-white/20 pt-4">
             <h4 className="text-sm font-bold uppercase opacity-80 mb-2">Season Summary</h4>
             <div className="flex justify-between text-sm opacity-90">
               <span>Matches Played</span>
               <span className="font-mono">12</span>
             </div>
             <div className="flex justify-between text-sm opacity-90">
               <span>Season Goals</span>
               <span className="font-mono">48</span>
             </div>
             <div className="flex justify-between text-sm opacity-90">
               <span>Avg Goals/Match</span>
               <span className="font-mono">4.0</span>
             </div>
           </div>
        </div>

        {/* Right Content: Analysis */}
        <div className="w-full md:w-2/3 p-6 bg-gray-50">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <Target className="text-indigo-600" /> Shot Analysis
             </h3>
             <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
               <X size={24} />
             </button>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             {/* Shot Chart */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
               <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase">Shot Map</h4>
               <KorfballField mode="view" events={shots} heatmapMode={false} />
               <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Goal</span>
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Miss</span>
               </div>
             </div>

             {/* Efficiency Stats */}
             <div className="space-y-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                 <div>
                   <div className="text-sm text-gray-500 font-bold uppercase">Efficiency</div>
                   <div className="text-xs text-gray-400">Field Goal %</div>
                 </div>
                 <div className="text-3xl font-black text-indigo-600">{shotPercentage}%</div>
               </div>
               
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                 <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase">By Zone</h4>
                 <div className="space-y-3">
                   {typeStats.length === 0 && <div className="text-sm text-gray-400 italic">No shots recorded yet.</div>}
                   {typeStats.map(stat => (
                     <div key={stat.label}>
                       <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                         <span>{stat.label}</span>
                         <span>{stat.goals}/{stat.attempts} ({stat.pct}%)</span>
                       </div>
                       <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                         <div 
                           className={`h-full rounded-full ${stat.pct > 50 ? 'bg-green-500' : stat.pct > 30 ? 'bg-yellow-500' : 'bg-red-400'}`} 
                           style={{ width: `${stat.pct}%` }}
                         ></div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
           
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;