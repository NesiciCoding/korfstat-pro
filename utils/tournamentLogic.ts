import { BracketNode, BracketConfig, GroupConfig, Group, BracketParticipant } from '../types/tournament';
import { Team, MatchState } from '../types';

/**
 * Calculates the number of rounds for a given number of teams in a knockout.
 * Teams should ideally be a power of 2 (4, 8, 16, 32).
 */
export const calculateRounds = (teamCount: number): number => {
    return Math.ceil(Math.log2(teamCount));
};

/**
 * Generates an empty bracket structure based on the number of teams.
 */
export const generateEmptyBracket = (config: BracketConfig): BracketNode[] => {
    const nodes: BracketNode[] = [];
    const rounds = calculateRounds(config.teamCount);
    
    // Generate from Final (round 0) up to the earliest round
    for (let round = 0; round < rounds; round++) {
        const matchesInRound = Math.pow(2, round);
        for (let pos = 0; pos < matchesInRound; pos++) {
            
            let id = '';
            let nameOverride = '';
            
            if (round === 0) {
                id = 'FINAL';
            } else if (round === 1) {
                id = `SF_${pos + 1}`;
                nameOverride = `Winner QF${(pos * 2) + 1} / QF${(pos * 2) + 2}`;
            } else if (round === 2) {
                id = `QF_${pos + 1}`;
            } else if (round === 3) {
                id = `R16_${pos + 1}`;
            } else {
                id = `R${round}_${pos + 1}`;
            }

            // Figure out source nodes for TBDs
            let homeSource = '';
            let awaySource = '';
            if (round < rounds - 1) {
                // Not the first round, so inputs come from previous round (which is `round + 1`)
                const prevRoundMatches = Math.pow(2, round + 1);
                // The Home team for this match comes from match (pos * 2) of the previous round
                // The Away team comes from match (pos * 2) + 1
                
                const getPrefix = (r: number) => {
                    if (r === 1) return 'SF';
                    if (r === 2) return 'QF';
                    if (r === 3) return 'R16';
                    return `R${r}`;
                };
                
                const prefix = getPrefix(round + 1);
                homeSource = `${prefix}_${(pos * 2) + 1}`;
                awaySource = `${prefix}_${(pos * 2) + 2}`;
            }

            nodes.push({
                id,
                round,
                position: pos,
                home: { 
                    type: round === rounds - 1 ? 'TBD' : 'WINNER_OF',
                    sourceNodeId: round === rounds - 1 ? undefined : homeSource,
                    nameOverride: round === rounds - 1 ? 'TBD' : `Winner ${homeSource}`
                },
                away: { 
                    type: round === rounds - 1 ? 'TBD' : 'WINNER_OF',
                    sourceNodeId: round === rounds - 1 ? undefined : awaySource,
                    nameOverride: round === rounds - 1 ? 'TBD' : `Winner ${awaySource}`
                }
            });
        }
    }

    if (config.thirdPlaceMatch) {
         nodes.push({
             id: 'THIRD_PLACE',
             round: 0,
             position: 1, // Final is 0, Third is 1
             home: {
                 type: 'LOSER_OF',
                 sourceNodeId: 'SF_1',
                 nameOverride: 'Loser SF_1'
             },
             away: {
                 type: 'LOSER_OF',
                 sourceNodeId: 'SF_2',
                 nameOverride: 'Loser SF_2'
             }
         });
    }

    // Sort nodes so earlist rounds are first, and within rounds by position
    return nodes.sort((a, b) => b.round - a.round || a.position - b.position);
};

/**
 * Generates initial groups for a Group Stage.
 */
export const generateGroups = (config: GroupConfig, teams: Team[]): Group[] => {
    const groups: Group[] = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < config.groupCount; i++) {
        groups.push({
            id: `GROUP_${alphabet[i]}`,
            name: `Group ${alphabet[i]}`,
            teamIds: []
        });
    }

    // Snake draft distribution of teams into groups if teams are provided
    teams.forEach((team, index) => {
        // Snake logic: 0..N, N..0, 0..N...
        const row = Math.floor(index / config.groupCount);
        let col = index % config.groupCount;
        if (row % 2 !== 0) {
            col = config.groupCount - 1 - col;
        }
        groups[col].teamIds.push(team.id);
    });

    return groups;
};

/**
 * Updates a bracket with actual team IDs as matches conclude.
 * Returns a new array of updated bracket nodes.
 */
export const updateBracketProgression = (
    bracket: BracketNode[],
    bracketMap: Record<string, string>,
    matches: MatchState[]
): BracketNode[] => {
    // Deep copy to avoid mutating state directly in unpredictable ways
    const updatedBracket = JSON.parse(JSON.stringify(bracket)) as BracketNode[];

    // First map all match results
    const results = new Map<string, { winnerId: string, loserId: string }>();

    updatedBracket.forEach(node => {
        const matchId = bracketMap[node.id];
        if (matchId) {
            const match = matches.find(m => m.id === matchId);
            // Assume match is finished if it has a winner (you'd normally check a status like isFinished)
            // For now, if there's an event... wait, match logic needs a way to know it's "finished".
            // Let's assume if elapsedSeconds == halfDurationSeconds * 2 it's finished, but simpler:
            // Let's assume the user "ends" the match somehow. We'll check if timer is stopped and score exists?
            // Since we don't have a rigid `isFinished` flag yet, we'll infer it from score for testing, 
            // or we evaluate it if provided. Let's just calculate score and assume if we call this, we only care about concluded matches.
            if (match) {
                let homeGoals = 0;
                let awayGoals = 0;
                match.events.forEach(e => {
                    if (e.type === 'SHOT' && e.result === 'GOAL') {
                        if (e.teamId === 'HOME') homeGoals++;
                        else awayGoals++;
                    }
                });

                // ONLY register a result if it's not a draw (Tournaments must have a winner, perhaps via penalties)
                // For MVP, if Home > Away, Home wins.
                if (homeGoals > awayGoals) {
                    results.set(node.id, { winnerId: match.homeTeam.id, loserId: match.awayTeam.id });
                } else if (awayGoals > homeGoals) {
                    results.set(node.id, { winnerId: match.awayTeam.id, loserId: match.homeTeam.id });
                }
            }
        }
    });

    // Now propagate teamIds down the bracket based on WINNER_OF and LOSER_OF rules
    updatedBracket.forEach(node => {
        // Resolve Home
        if (node.home.type === 'WINNER_OF' && node.home.sourceNodeId) {
            const result = results.get(node.home.sourceNodeId);
            if (result) {
                node.home.teamId = result.winnerId;
            }
        } else if (node.home.type === 'LOSER_OF' && node.home.sourceNodeId) {
            const result = results.get(node.home.sourceNodeId);
            if (result) {
                node.home.teamId = result.loserId;
            }
        }

        // Resolve Away
        if (node.away.type === 'WINNER_OF' && node.away.sourceNodeId) {
            const result = results.get(node.away.sourceNodeId);
            if (result) {
                node.away.teamId = result.winnerId;
            }
        } else if (node.away.type === 'LOSER_OF' && node.away.sourceNodeId) {
            const result = results.get(node.away.sourceNodeId);
            if (result) {
                node.away.teamId = result.loserId;
            }
        }
    });

    return updatedBracket;
};
