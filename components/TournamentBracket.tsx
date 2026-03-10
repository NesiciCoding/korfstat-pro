import React from 'react';
import { useTranslation } from 'react-i18next';
import { BracketNode, BracketParticipant } from '../types/tournament';
import { MatchState, Team } from '../types';
import { Trophy, Clock } from 'lucide-react';

interface TournamentBracketProps {
    bracketMap: Record<string, string>; // Maps node ID to match ID
    nodes: BracketNode[];
    matches: MatchState[];
    teams: Team[];
    onMatchClick: (node: BracketNode, match?: MatchState) => void;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ bracketMap, nodes, matches, teams, onMatchClick }) => {
    const { t } = useTranslation();
    // Group nodes by round
    const maxRound = Math.max(...nodes.map(n => n.round), 0);
    const minRound = Math.min(...nodes.map(n => n.round), 0); // Usually 0 is Final

    const rounds = [];
    // Standard progression: QF (2) -> SF (1) -> F (0)
    for (let r = maxRound; r >= minRound; r--) {
        const roundNodes = nodes.filter(n => n.round === r && n.id !== 'THIRD_PLACE').sort((a, b) => a.position - b.position);
        if (roundNodes.length > 0) {
            rounds.push({ round: r, nodes: roundNodes });
        }
    }

    const thirdPlaceNode = nodes.find(n => n.id === 'THIRD_PLACE');

    const renderParticipant = (participant: BracketParticipant) => {
        if (participant.teamId) {
            const team = teams.find(t => t.id === participant.teamId);
            return (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team?.color || '#ccc' }} />
                    <span className="font-bold truncate" title={team?.name}>{team?.name || 'Unknown'}</span>
                </div>
            );
        }

        let label = t('season.tbd');
        if (participant.nameOverride) label = participant.nameOverride;
        
        return <span className="text-gray-400 italic text-sm">{label}</span>;
    };

    const renderScore = (match?: MatchState) => {
        if (!match) return null;
        let homeScore = 0;
        let awayScore = 0;
        match.events.forEach(e => {
            if (e.type === 'SHOT' && e.result === 'GOAL') {
                if (e.teamId === 'HOME') homeScore++;
                else awayScore++;
            }
        });
        
        // Let's assume elapsedSeconds > 0 means it started
        if (match.timer.elapsedSeconds === 0 && homeScore === 0 && awayScore === 0) {
             return <span className="text-xs text-gray-400">{t('season.notStarted')}</span>;
        }

        return (
            <div className="flex flex-col items-center justify-center font-mono font-bold text-sm bg-gray-100 dark:bg-gray-700 rounded p-1 min-w-[30px]">
                <div className={homeScore > awayScore ? 'text-indigo-600 dark:text-indigo-400' : ''}>{homeScore}</div>
                <div className="h-[1px] w-full bg-gray-300 dark:bg-gray-600 my-1"></div>
                <div className={awayScore > homeScore ? 'text-indigo-600 dark:text-indigo-400' : ''}>{awayScore}</div>
            </div>
        );
    };

    const renderNode = (node: BracketNode) => {
        const matchId = bracketMap[node.id];
        const match = matchId ? matches.find(m => m.id === matchId) : undefined;
        
        return (
            <div 
                key={node.id} 
                onClick={() => onMatchClick(node, match)}
                className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all flex mb-4 relative z-10"
            >
                <div className="flex-1 flex flex-col justify-between p-3 gap-2">
                    <div className="flex items-center justify-between">
                        {renderParticipant(node.home)}
                    </div>
                    <div className="flex items-center justify-between">
                        {renderParticipant(node.away)}
                    </div>
                </div>
                {/* Score Column */}
                <div className="bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 rounded-r-lg w-10 flex items-center justify-center p-1">
                    {renderScore(match)}
                </div>
                
                {/* Node Label Banner */}
                <div className="absolute -top-2.5 right-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-indigo-200 dark:border-indigo-700">
                    {node.id.replace('_', ' ')}
                </div>
            </div>
        );
    };

    return (
        <div id="bracket-export-region" className="w-full overflow-x-auto py-8 px-4 bg-gray-50 dark:bg-gray-900 min-h-[500px]">
            <div className="flex gap-16 min-w-max items-center justify-center">
                {rounds.map((roundGroup, idx) => {
                    let roundName = t('season.round');
                    if (roundGroup.round === 0) roundName = t('season.final');
                    else if (roundGroup.round === 1) roundName = t('season.semiFinals');
                    else if (roundGroup.round === 2) roundName = t('season.quarterFinals');
                    else if (roundGroup.round === 3) roundName = t('season.roundOf16');

                    return (
                        <div key={roundGroup.round} className="flex flex-col relative">
                            {/* Round Header */}
                            <h4 className="text-center font-bold text-gray-500 dark:text-gray-400 uppercase text-xs mb-6 tracking-wider">
                                {roundName}
                            </h4>
                            
                            <div className="flex flex-col flex-1 justify-around gap-8">
                                {roundGroup.nodes.map(node => (
                                    <div key={node.id} className="relative flex items-center">
                                        {renderNode(node)}
                                        {/* Connecting Lines could go here using absolute positioning, but keeping it simple for now */}
                                        {roundGroup.round > 0 && (
                                            <div className="w-8 border-b-2 border-gray-300 dark:border-gray-600 self-center hidden md:block"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Third Place Match - Rendered distinctly at the end or below Final */}
                {thirdPlaceNode && (
                    <div className="flex flex-col ml-8 mt-auto mb-8 relative self-end">
                         <h4 className="text-center font-bold text-amber-600 dark:text-amber-500 uppercase text-xs mb-2 tracking-wider flex items-center justify-center gap-1">
                             <Trophy size={12} /> {t('season.thirdPlace')}
                         </h4>
                         {renderNode(thirdPlaceNode)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TournamentBracket;
