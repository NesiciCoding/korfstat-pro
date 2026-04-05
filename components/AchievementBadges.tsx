import React from 'react';
import { Milestone, MilestoneTier } from '../types/stats';
import { Trophy, Target, Shield, Star, Award } from 'lucide-react';

interface AchievementBadgesProps {
    milestones: Milestone[];
}

const TIER_COLORS: Record<MilestoneTier, string> = {
    BRONZE: 'from-amber-600 to-amber-800 border-amber-500/50 shadow-amber-900/20',
    SILVER: 'from-gray-300 to-gray-500 border-gray-200/50 shadow-gray-900/20',
    GOLD: 'from-yellow-400 to-yellow-600 border-yellow-300/50 shadow-yellow-900/20',
    PLATINUM: 'from-indigo-400 to-indigo-600 border-indigo-300/50 shadow-indigo-900/20',
    DIAMOND: 'from-cyan-300 to-cyan-500 border-cyan-200/50 shadow-cyan-900/20 animate-pulse',
};

const MilestoneIcon = ({ type, size = 20 }: { type: Milestone['type'], size?: number }) => {
    switch (type) {
        case 'GOALS': return <Target size={size} />;
        case 'ACCURACY': return <Trophy size={size} />;
        case 'CLUTCH': return <Star size={size} />;
        case 'IRON_WALL': return <Shield size={size} />;
        default: return <Award size={size} />;
    }
};

const AchievementBadges: React.FC<AchievementBadgesProps> = ({ milestones }) => {
    if (!milestones || milestones.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-3">
            {milestones.map((milestone) => (
                <div
                    key={milestone.id}
                    className={`relative group flex items-center gap-2 px-3 py-1.5 rounded-full border bg-gradient-to-br ${TIER_COLORS[milestone.tier]} text-white shadow-lg transition-all hover:scale-105 hover:-translate-y-0.5`}
                    title={`${milestone.type}: ${milestone.value} (Threshold: ${milestone.threshold})`}
                >
                    <div className="bg-white/20 p-1 rounded-full backdrop-blur-sm">
                        <MilestoneIcon type={milestone.type} size={14} />
                    </div>
                    <span className="text-xs font-bold tracking-tight uppercase">
                        {milestone.tier === 'BRONZE' ? '' : milestone.tier} {milestone.type === 'GOALS' ? 'Century' : milestone.type.replace('_', ' ')}
                    </span>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-10 border border-gray-700">
                        <p className="font-bold border-b border-gray-700 pb-1 mb-1">{milestone.tier} {milestone.type}</p>
                        <p className="opacity-80">Achieved {new Date(milestone.achievedAt).toLocaleDateString()}</p>
                        <p className="mt-1 font-mono">{milestone.value} / {milestone.threshold} required</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AchievementBadges;
