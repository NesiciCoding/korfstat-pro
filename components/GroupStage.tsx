import React from 'react';
import { useTranslation } from 'react-i18next';
import { Group } from '../types/tournament';
import { MatchState, Team } from '../types';
import { Standing } from '../types/season';
import { Table } from 'lucide-react';

interface GroupStageProps {
    groups: Group[];
    matches: MatchState[];
    teams: Team[];
}

export const GroupStage: React.FC<GroupStageProps> = ({ groups, matches, teams }) => {
    const { t } = useTranslation();

    const calculateGroupStandings = (group: Group): Standing[] => {
        // Find matches where both teams are in this group
        const groupTeamIds = group.teamIds;
        const groupMatches = matches.filter(m => 
            groupTeamIds.includes(m.homeTeam.id) && groupTeamIds.includes(m.awayTeam.id)
        );

        const standingsMap = new Map<string, Standing>();
        
        // Initialize all teams in group with 0 stats
        group.teamIds.forEach(teamId => {
            const teamInfo = teams.find(t => t.id === teamId);
            standingsMap.set(teamId, {
                teamId: teamId,
                teamName: teamInfo?.name || t('season.tbd'),
                played: 0, won: 0, lost: 0, draw: 0,
                points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0
            });
        });

        groupMatches.forEach(match => {
            const home = standingsMap.get(match.homeTeam.id);
            const away = standingsMap.get(match.awayTeam.id);
            if (!home || !away) return;

            const homeGoals = match.events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
            const awayGoals = match.events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

            home.played++; away.played++;
            home.goalsFor += homeGoals; home.goalsAgainst += awayGoals;
            away.goalsFor += awayGoals; away.goalsAgainst += homeGoals;

            home.goalDifference = home.goalsFor - home.goalsAgainst;
            away.goalDifference = away.goalsFor - away.goalsAgainst;

            if (homeGoals > awayGoals) {
                home.won++; home.points += 3; away.lost++;
            } else if (awayGoals > homeGoals) {
                away.won++; away.points += 3; home.lost++;
            } else {
                home.draw++; away.draw++;
                home.points += 1; away.points += 1;
            }
        });

        return Array.from(standingsMap.values()).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full py-4">
            {groups.map((group, groupIdx) => {
                const standings = calculateGroupStandings(group);
                
                return (
                    <div key={group.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Table size={18} className="text-indigo-500" /> {group.name}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-3 py-2 rounded-l-lg">{t('season.pos')}</th>
                                        <th className="px-3 py-2">{t('season.team')}</th>
                                        <th className="px-2 py-2 text-center">{t('season.played')}</th>
                                        <th className="px-2 py-2 text-center">{t('season.gd')}</th>
                                        <th className="px-3 py-2 text-center rounded-r-lg font-bold">{t('season.pts')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {standings.map((team, index) => (
                                        <tr key={team.teamId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-3 py-2 font-medium">{index + 1}</td>
                                            <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">{team.teamName}</td>
                                            <td className="px-2 py-2 text-center">{team.played}</td>
                                            <td className="px-2 py-2 text-center font-medium">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                                            <td className="px-3 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{team.points}</td>
                                        </tr>
                                    ))}
                                    {standings.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-4 text-gray-400">{t('season.noTeams')}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default GroupStage;
