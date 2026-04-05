import React, { useMemo, useState } from 'react';
import { Player, MatchEvent, TeamId, SHOT_TYPES, MatchState } from '../types';
import KorfballField from './KorfballField';
import { X, Target, Shield, AlertTriangle, Trophy, ExternalLink } from 'lucide-react';
import { calculateCareerStats } from '../utils/statsCalculator';
import AchievementBadges from './AchievementBadges';
import PlayerProfile from './PlayerProfile';
import { ClubPlayer } from '../types/club';

interface PlayerProfileModalProps {
  player: Player;
  teamName: string;
  teamColor: string;
  events: MatchEvent[];
  savedMatches?: MatchState[];
  onClose: () => void;
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, teamName, teamColor, events, savedMatches = [], onClose }) => {
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Aggregate current match stats
  const playerEvents = events.filter(e => e.playerId === player.id);
  const shots = playerEvents.filter(e => e.type === 'SHOT');
  const goals = shots.filter(e => e.result === 'GOAL');
  const rebounds = playerEvents.filter(e => e.type === 'REBOUND');
  const fouls = playerEvents.filter(e => e.type === 'FOUL');

  const shotPercentage = shots.length > 0 ? Math.round((goals.length / shots.length) * 100) : 0;

  // Career Stats for this player
  const careerStats = useMemo(() => calculateCareerStats(player.id, savedMatches), [player.id, savedMatches]);

  // Transform Player to ClubPlayer for the full profile component if needed
  const clubPlayer: ClubPlayer = {
    id: player.id,
    firstName: player.name.split(' ')[0],
    lastName: player.name.split(' ').slice(1).join(' ') || '',
    gender: player.gender || 'M',
    active: true,
    shirtNumber: player.number,
    positions: [player.initialPosition]
  };

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

  if (showFullProfile) {
    return (
      <PlayerProfile 
        player={clubPlayer}
        matches={savedMatches}
        onClose={() => setShowFullProfile(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Sidebar: Profile Info */}
        <div className={`w-full md:w-1/3 p-6 text-white ${teamColor.includes('red') ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
          <div className="flex justify-between items-start mb-6 md:mb-10">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">KorfStat Match Profile</span>
            </div>
            <button onClick={onClose} className="md:hidden text-white/80 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold border-4 border-white/30 shadow-lg">
              {player.number}
            </div>
            <h2 className="text-3xl font-bold mb-1 tracking-tight">{player.name}</h2>
            <p className="opacity-90 font-medium text-sm uppercase tracking-widest">{teamName}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase">
                {player.isStarter ? 'Starter' : 'Substitute'}
              </span>
              <button 
                onClick={() => setShowFullProfile(true)}
                className="px-3 py-1 bg-white text-blue-600 rounded-full text-xs font-bold uppercase flex items-center gap-1 hover:bg-gray-100 transition-colors shadow-sm"
              >
                <ExternalLink size={10} /> Full Career
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center mb-8">
            <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm">
              <div className="text-2xl font-black">{goals.length}</div>
              <div className="text-[10px] font-bold uppercase opacity-70 tracking-tighter">Goals</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm">
              <div className="text-2xl font-black">{shots.length}</div>
              <div className="text-[10px] font-bold uppercase opacity-70 tracking-tighter">Shots</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm">
              <div className="text-2xl font-black">{rebounds.length}</div>
              <div className="text-[10px] font-bold uppercase opacity-70 tracking-tighter">Rebounds</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm">
              <div className="text-2xl font-black">{fouls.length}</div>
              <div className="text-[10px] font-bold uppercase opacity-70 tracking-tighter">Fouls</div>
            </div>
          </div>

          {/* Achievement Badges Mini Section */}
          {careerStats.milestones.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/20">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-3 flex items-center gap-2">
                <Trophy size={12} /> Career Achievements
              </h4>
              <div className="scale-90 origin-left">
                <AchievementBadges milestones={careerStats.milestones.slice(0, 3)} />
              </div>
            </div>
          )}

          {/* Historical Summary */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-3">Season Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium opacity-90">
                <span>Matches Played</span>
                <span>{careerStats.matchesPlayed}</span>
              </div>
              <div className="flex justify-between text-xs font-medium opacity-90">
                <span>Total Goals</span>
                <span>{careerStats.goals}</span>
              </div>
              <div className="flex justify-between text-xs font-medium opacity-90">
                <span>Career Accuracy</span>
                <span>{careerStats.shootingPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Analysis */}
        <div className="w-full md:w-2/3 p-8 bg-gray-50 dark:bg-gray-950">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="text-indigo-600 dark:text-indigo-400" /> Match Analysis
            </h3>
            <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Shot Chart */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">Shot Distribution</h4>
              <KorfballField mode="view" events={shots} heatmapMode={false} />
              <div className="flex justify-center gap-4 mt-6 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"></div> Goal</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/20"></div> Miss</span>
              </div>
            </div>

            {/* Efficiency Stats */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:border-indigo-500 transition-colors">
                <div>
                  <div className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">Match Efficiency</div>
                  <div className="text-sm text-gray-500 font-medium">Field Goal %</div>
                </div>
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">{shotPercentage}%</div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest font-bold">Zone Breakdown</h4>
                <div className="space-y-5">
                  {typeStats.length === 0 && <div className="text-sm text-gray-400 italic py-4 text-center">No shots recorded in this match.</div>}
                  {typeStats.map(stat => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                        <span>{stat.label}</span>
                        <span className="font-mono">{stat.goals}/{stat.attempts} ({stat.pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${stat.pct > 50 ? 'bg-emerald-500' : stat.pct > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${stat.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Match Context could go here */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
             <AlertTriangle className="text-indigo-500 shrink-0" size={18} />
             <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
               This profile shows stats for the selected match only. Click "Full Career" in the sidebar to view historical trends and all achievements.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileModal;