import React, { useState, useEffect } from 'react';
import { Club } from '../types/club';
import { ClubService } from '../services/clubService';
import { Plus, Trash2, Edit2, Users, ArrowLeft, Download, BarChart2 } from 'lucide-react';
import ClubEditor from './ClubEditor'; // We will create this next
import { MatchState } from '../types';
import { calculateCareerStats } from '../utils/statsCalculator';

interface ClubManagerProps {
    onBack: () => void;
    savedMatches?: MatchState[];
}

const ClubManager: React.FC<ClubManagerProps> = ({ onBack, savedMatches = [] }) => {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadClubs();
    }, []);

    const loadClubs = () => {
        setClubs(ClubService.getAllClubs());
    };

    const handleCreate = () => {
        const newClub: Club = {
            id: crypto.randomUUID(),
            name: 'New Club',
            shortName: 'NEW',
            primaryColor: '#000000',
            players: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        ClubService.saveClub(newClub);
        loadClubs();
        setSelectedClub(newClub);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this club?')) {
            ClubService.deleteClub(id);
            loadClubs();
            if (selectedClub?.id === id) setSelectedClub(null);
        }
    };

    const handleImportLegacy = () => {
        const count = ClubService.migrateLegacyTeams(); // We need to update Service to return count
        if (count > 0) {
            alert(`Migrated ${count} teams!`);
            loadClubs();
        } else {
            alert('No new unique teams found to migrate.');
        }
    };

    if (selectedClub) {
        return (
            <ClubEditor
                club={selectedClub}
                onBack={() => { setSelectedClub(null); loadClubs(); }}
                savedMatches={savedMatches}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors">
                            <ArrowLeft className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Users className="text-indigo-500" />
                            Club Manager
                        </h1>
                    </div>
                    <button
                        onClick={handleImportLegacy}
                        className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium flex items-center gap-2"
                    >
                        <Download size={16} /> Import Legacy Teams
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create Card */}
                    <div
                        onClick={handleCreate}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer group"
                    >
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">Create New Club</span>
                    </div>

                    {/* Club List */}
                    {clubs.map(club => (
                        <div
                            key={club.id}
                            onClick={() => setSelectedClub(club)}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer relative group"
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleDelete(club.id, e)}
                                    className="p-2 text-gray-400 hover:text-red-600 bg-white/50 rounded-full hover:bg-white"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                                    style={{ backgroundColor: club.primaryColor }}
                                >
                                    {club.shortName}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{club.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Users size={14} /> {club.players.length} Players
                                        </span>
                                        {savedMatches.length > 0 && (
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                <BarChart2 size={14} />
                                                {/* Calculate total club goals strictly for fun/summary? OR just say "Active in X matches" */}
                                                Stats Available
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mini Roster Preview with Stats? Or just keep simple? */}
                            {/* Let's show top scorer if matches exist? */}
                            {savedMatches.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">Internal Top Scorers</div>
                                    <div className="space-y-1">
                                        {club.players
                                            .map(p => ({ p, stats: calculateCareerStats(p.id, savedMatches) }))
                                            .sort((a, b) => b.stats.goals - a.stats.goals)
                                            .slice(0, 3)
                                            .filter(item => item.stats.goals > 0)
                                            .map(({ p, stats }) => (
                                                <div key={p.id} className="flex justify-between text-xs">
                                                    <span className="text-gray-700 dark:text-gray-300">{p.firstName} {p.lastName}</span>
                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{stats.goals} G</span>
                                                </div>
                                            ))
                                        }
                                        {club.players.every(p => calculateCareerStats(p.id, savedMatches).goals === 0) && (
                                            <div className="text-xs text-gray-400 italic">No goals recorded yet</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ClubManager;
