import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trophy, Calendar, ChevronRight, Table, GitMerge } from 'lucide-react';
import { Season, Standing } from '../types/season';
import { MatchState, Team } from '../types';
import TournamentBracket from './TournamentBracket';
import { generateEmptyBracket, updateBracketProgression } from '../utils/tournamentLogic';
import { exportBracketToPDF } from '../services/bracketExport';
import GroupStage from './GroupStage';

interface SeasonManagerProps {
    onBack: () => void;
    matches: MatchState[];
}

const SeasonManager: React.FC<SeasonManagerProps> = ({ onBack, matches }) => {
    const { t } = useTranslation();
    const [seasons, setSeasons] = useState<Season[]>(() => {
        const saved = localStorage.getItem('korfstat_seasons');
        return saved ? JSON.parse(saved) : [];
    });

    const [activeSeason, setActiveSeason] = useState<Season | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newSeasonName, setNewSeasonName] = useState('');
    const [newSeasonFormat, setNewSeasonFormat] = useState<'LEAGUE' | 'KNOCKOUT' | 'GROUP_KNOCKOUT'>('LEAGUE');
    const [newBracketSize, setNewBracketSize] = useState<number>(8);
    const [newGroupCount, setNewGroupCount] = useState<number>(2);

    useEffect(() => {
        localStorage.setItem('korfstat_seasons', JSON.stringify(seasons));
    }, [seasons]);

    const handleCreateSeason = () => {
        if (!newSeasonName.trim()) return;
        let initialGroups = undefined;
        if (newSeasonFormat === 'GROUP_KNOCKOUT') {
            initialGroups = Array.from({ length: newGroupCount }).map((_, i) => ({
                id: `GROUP_${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]}`,
                name: `Group ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]}`,
                teamIds: []
            }));
        }

        const newSeason: Season = {
            id: crypto.randomUUID(),
            name: newSeasonName,
            format: newSeasonFormat,
            startDate: Date.now(),
            teams: [],
            matches: [],
            standings: [],
            bracketMap: {},
            bracketConfig: ['KNOCKOUT', 'GROUP_KNOCKOUT'].includes(newSeasonFormat)
                ? { teamCount: newBracketSize, thirdPlaceMatch: true }
                : undefined,
            groups: initialGroups
        };
        setSeasons([...seasons, newSeason]);
        setNewSeasonName('');
        setIsCreating(false);
    };

    // Recalculate standings for the active season based on linked matches
    const calculateStandings = (season: Season) => {
        const seasonMatches = matches.filter(m => m.seasonId === season.id);
        // Assuming we link matches via seasonId
        // OR if we store match IDs in the season object. Let's support both for robustness.
        // Ideally, match objects should store their season ID.

        // For this MVP, let's assume we filter `matches` prop by `seasonId` if it exists.
        // AND if the season object has a list of match IDs, we check that too.

        const relevantMatches = matches.filter(m => m.seasonId === season.id);

        const standingsMap = new Map<string, Standing>();

        relevantMatches.forEach(match => {
            // Helper to get or init standing
            const getStanding = (name: string): Standing => {
                if (!standingsMap.has(name)) {
                    standingsMap.set(name, {
                        teamId: name, // unique by name for now
                        teamName: name,
                        played: 0,
                        won: 0,
                        lost: 0,
                        draw: 0,
                        points: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        goalDifference: 0
                    });
                }
                return standingsMap.get(name)!;
            };

            const home = getStanding(match.homeTeam.name);
            const away = getStanding(match.awayTeam.name);

            const homeGoals = match.events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
            const awayGoals = match.events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

            home.played++;
            away.played++;
            home.goalsFor += homeGoals;
            home.goalsAgainst += awayGoals;
            away.goalsFor += awayGoals;
            away.goalsAgainst += homeGoals;

            home.goalDifference = home.goalsFor - home.goalsAgainst;
            away.goalDifference = away.goalsFor - away.goalsAgainst;

            if (homeGoals > awayGoals) {
                home.won++;
                home.points += 2;
                //Standard point allocation in the Netherlands and Belgium for a win is 2 points.
                //Could be adapted to other points if needed
                away.lost++;
            } else if (awayGoals > homeGoals) {
                away.won++;
                away.points += 2;
                home.lost++;
            } else {
                home.draw++;
                away.draw++;
                home.points += 1;
                away.points += 1;
            }
        });

        return Array.from(standingsMap.values()).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Trophy className="text-yellow-500" />
                        {t('season.title')}
                    </h1>
                </div>

                {activeSeason ? (
                    // Active Season View
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 cursor-pointer hover:text-indigo-500" onClick={() => setActiveSeason(null)}>
                            <span>{t('season.breadcrumb')}</span>
                            <ChevronRight size={14} />
                            <span className="font-semibold">{activeSeason.name}</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Content Area */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                {(!activeSeason.format || activeSeason.format === 'LEAGUE') && (
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Table size={20} /> {t('season.leagueTable')}
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                                                    <tr>
                                                        <th className="px-4 py-3 rounded-l-lg">{t('season.pos')}</th>
                                                        <th className="px-4 py-3">{t('season.team')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.played')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.won')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.draw')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.lost')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.gf')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.ga')}</th>
                                                        <th className="px-4 py-3 text-center">{t('season.gd')}</th>
                                                        <th className="px-4 py-3 text-center rounded-r-lg font-bold">{t('season.pts')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {calculateStandings(activeSeason).map((team, index) => (
                                                        <tr key={team.teamId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-3 font-medium">{index + 1}</td>
                                                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{team.teamName}</td>
                                                            <td className="px-4 py-3 text-center">{team.played}</td>
                                                            <td className="px-4 py-3 text-center">{team.won}</td>
                                                            <td className="px-4 py-3 text-center">{team.draw}</td>
                                                            <td className="px-4 py-3 text-center">{team.lost}</td>
                                                            <td className="px-4 py-3 text-center text-gray-400">{team.goalsFor}</td>
                                                            <td className="px-4 py-3 text-center text-gray-400">{team.goalsAgainst}</td>
                                                            <td className="px-4 py-3 text-center font-medium">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                                                            <td className="px-4 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{team.points}</td>
                                                        </tr>
                                                    ))}
                                                    {calculateStandings(activeSeason).length === 0 && (
                                                        <tr>
                                                            <td colSpan={10} className="text-center py-8 text-gray-400">{t('season.noMatches')}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {['KNOCKOUT', 'GROUP_KNOCKOUT'].includes(activeSeason.format || '') && (
                                    <div className="flex flex-col gap-6">
                                        {activeSeason.format === 'GROUP_KNOCKOUT' && (
                                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <Table size={18} /> {t('season.groupStage')}
                                                    </h3>
                                                </div>
                                                <div className="p-2">
                                                    {(() => {
                                                        const allTeams = new Map<string, Team>();
                                                        matches.filter(m => m.seasonId === activeSeason.id).forEach(m => {
                                                            allTeams.set(m.homeTeam.id, m.homeTeam);
                                                            allTeams.set(m.awayTeam.id, m.awayTeam);
                                                        });
                                                        return (
                                                            <GroupStage
                                                                groups={activeSeason.groups || []}
                                                                matches={matches.filter(m => m.seasonId === activeSeason.id)}
                                                                teams={Array.from(allTeams.values())}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <GitMerge size={18} /> {t('season.bracket')}
                                                </h3>
                                                <button
                                                    onClick={() => exportBracketToPDF('bracket-export-region', activeSeason.name)}
                                                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                                                >
                                                    {t('season.exportBracket')}
                                                </button>
                                            </div>
                                            <div className="w-full overflow-x-auto min-h-[500px]">
                                                {(() => {
                                                    const nodes = generateEmptyBracket(activeSeason.bracketConfig || { teamCount: 8, thirdPlaceMatch: true });
                                                    const allTeams = new Map<string, Team>();
                                                    matches.filter(m => m.seasonId === activeSeason.id).forEach(m => {
                                                        allTeams.set(m.homeTeam.id, m.homeTeam);
                                                        allTeams.set(m.awayTeam.id, m.awayTeam);
                                                    });

                                                    const progressedNodes = updateBracketProgression(nodes, activeSeason.bracketMap || {}, matches);
                                                    return (
                                                        <TournamentBracket
                                                            bracketMap={activeSeason.bracketMap || {}}
                                                            nodes={progressedNodes}
                                                            matches={matches}
                                                            teams={Array.from(allTeams.values())}
                                                            onMatchClick={(node, match) => {
                                                                console.log('Clicked node', node.id, match?.id);
                                                                alert(t('season.matchClickAlert', { id: node.id }));
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stats / Info Sidebar */}
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('season.info')}</h3>
                                    <div className="text-sm text-gray-500 space-y-2">
                                        <div className="flex justify-between">
                                            <span>{t('season.started')}</span>
                                            <span>{new Date(activeSeason.startDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t('season.matches')}</span>
                                            <span>{matches.filter(m => m.seasonId === activeSeason.id).length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Season List View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Create New Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer group"
                            onClick={() => setIsCreating(true)}
                        >
                            {!isCreating ? (
                                <>
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{t('season.createSeason')}</span>
                                </>
                            ) : (
                                <div className="w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder={t('season.seasonPlaceholder')}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                                        value={newSeasonName}
                                        onChange={(e) => setNewSeasonName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateSeason()}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={newSeasonFormat}
                                            onChange={(e) => setNewSeasonFormat(e.target.value as any)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                        >
                                            <option value="LEAGUE">{t('season.leagueFormat')}</option>
                                            <option value="KNOCKOUT">{t('season.knockoutFormat')}</option>
                                            <option value="GROUP_KNOCKOUT">{t('season.groupKnockoutFormat')}</option>
                                        </select>
                                    </div>
                                    {['KNOCKOUT', 'GROUP_KNOCKOUT'].includes(newSeasonFormat) && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2 items-center">
                                                <label className="text-xs text-gray-500 whitespace-nowrap min-w-[80px]">{t('season.bracketSize')}</label>
                                                <select
                                                    value={newBracketSize}
                                                    onChange={(e) => setNewBracketSize(Number(e.target.value))}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                                >
                                                    <option value={4}>{t('season.teamCount', { count: 4 })}</option>
                                                    <option value={8}>{t('season.teamCount', { count: 8 })}</option>
                                                    <option value={16}>{t('season.teamCount', { count: 16 })}</option>
                                                    <option value={32}>{t('season.teamCount', { count: 32 })}</option>
                                                </select>
                                            </div>
                                            {newSeasonFormat === 'GROUP_KNOCKOUT' && (
                                                <div className="flex gap-2 items-center">
                                                    <label className="text-xs text-gray-500 whitespace-nowrap min-w-[80px]">{t('season.groupCount')}</label>
                                                    <select
                                                        value={newGroupCount}
                                                        onChange={(e) => setNewGroupCount(Number(e.target.value))}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                                    >
                                                        <option value={2}>{t('season.groupCountSelect', { count: 2 })}</option>
                                                        <option value={4}>{t('season.groupCountSelect', { count: 4 })}</option>
                                                        <option value={8}>{t('season.groupCountSelect', { count: 8 })}</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={handleCreateSeason} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">{t('season.create')}</button>
                                        <button onClick={() => setIsCreating(false)} className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm">{t('common.cancel')}</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Season Cards */}
                        {seasons.map(season => {
                            const seasonMatches = matches.filter(m => m.seasonId === season.id);
                            return (
                                <div
                                    key={season.id}
                                    onClick={() => setActiveSeason(season)}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer relative group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400">
                                            <Trophy size={20} />
                                        </div>
                                        <Calendar size={16} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{season.name}</h3>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {seasonMatches.length} {t('season.matchesRecorded')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeasonManager;
