import React, { useState } from 'react';
import { Club, ClubPlayer } from '../types/club';
import { ClubService } from '../services/clubService';
import { ArrowLeft, Plus, Save, Trash2, User, Users } from 'lucide-react';
import { MatchState } from '../types';
import { calculateCareerStats } from '../utils/statsCalculator';
import PlayerProfile from './PlayerProfile';

interface ClubEditorProps {
    club: Club;
    onBack: () => void;
    savedMatches?: MatchState[];
}

const ClubEditor: React.FC<ClubEditorProps> = ({ club, onBack, savedMatches = [] }) => {
    const [name, setName] = useState(club.name);
    const [shortName, setShortName] = useState(club.shortName);
    const [primaryColor, setPrimaryColor] = useState(club.primaryColor);
    const [players, setPlayers] = useState<ClubPlayer[]>(club.players);
    const [viewingPlayer, setViewingPlayer] = useState<ClubPlayer | null>(null);

    const handleSave = () => {
        const updatedClub: Club = {
            ...club,
            name,
            shortName,
            primaryColor,
            players, // In a real app we might rely on the service more granularly, but here we save the whole object
            updatedAt: Date.now()
        };
        ClubService.saveClub(updatedClub);
        onBack();
    };

    const addPlayer = () => {
        const newPlayer: ClubPlayer = {
            id: crypto.randomUUID(),
            firstName: 'New',
            lastName: 'Player',
            gender: 'M',
            active: true,
            positions: ['ATTACK']
        };
        setPlayers([...players, newPlayer]);
    };

    const updatePlayer = (id: string, field: keyof ClubPlayer, value: any) => {
        setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const removePlayer = (id: string) => {
        setPlayers(players.filter(p => p.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors">
                            <ArrowLeft className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Club</h1>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                    >
                        <Save size={20} /> Save Changes
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                    <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Club Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Club Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short Name (3 chars)</label>
                            <input
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 3))}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 uppercase font-mono text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="w-10 h-10 p-0 border-none rounded cursor-pointer"
                                />
                                <input
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 font-mono uppercase text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Users size={20} /> Squad Roster ({players.length})
                        </h2>
                        <button
                            onClick={addPlayer}
                            className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:bg-indigo-50 px-3 py-1 rounded"
                        >
                            <Plus size={16} /> Add Player
                        </button>
                    </div>

                    <div className="grid grid-cols-12 gap-3 mb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                        <div className="col-span-4 md:col-span-5">Player Details</div>
                        <div className="col-span-2">Gender</div>
                        <div className="col-span-2 text-center">Number</div>
                        <div className="col-span-3 md:col-span-2 text-center">Career Stats</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="space-y-2">
                        {players.map((player) => {
                            const stats = calculateCareerStats(player.id, savedMatches);
                            return (
                                <div key={player.id} className="grid grid-cols-12 gap-3 items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                    <div className="col-span-4 md:col-span-5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 shrink-0">
                                            <User size={16} />
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-2 w-full">
                                            <input
                                                value={player.firstName}
                                                onChange={(e) => updatePlayer(player.id, 'firstName', e.target.value)}
                                                placeholder="First Name"
                                                className="w-full md:w-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                            />
                                            <input
                                                value={player.lastName}
                                                onChange={(e) => updatePlayer(player.id, 'lastName', e.target.value)}
                                                placeholder="Last Name"
                                                className="w-full md:w-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <select
                                            value={player.gender}
                                            onChange={(e) => updatePlayer(player.id, 'gender', e.target.value as any)}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                        >
                                            <option value="M">M</option>
                                            <option value="F">F</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 text-center">
                                        <input
                                            type="number"
                                            value={player.shirtNumber || ''}
                                            onChange={(e) => updatePlayer(player.id, 'shirtNumber', parseInt(e.target.value))}
                                            placeholder="#"
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm text-center text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div
                                        className="col-span-3 md:col-span-2 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                                        title="Click to view full profile"
                                        onClick={() => setViewingPlayer(player)}
                                    >
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{stats.goals} G</div>
                                        <div className="text-xs text-gray-400">{stats.matchesPlayed} Matches</div>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            onClick={() => removePlayer(player.id)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {viewingPlayer && (
                        <PlayerProfile
                            player={viewingPlayer}
                            matches={savedMatches}
                            onClose={() => setViewingPlayer(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClubEditor;
