import { MatchState, TeamId, Team, Player } from '../types';
import { getScore } from '../utils/matchUtils';

export interface TeamScoutData {
    teamName: string;
    matchCount: number;
    avgGoals: number;
    shootingEfficiency: {
        total: number;
        near: number;
        medium: number;
        far: number;
        penalty: number;
        freeThrow: number;
        runningIn: number;
    };
    rebounds: {
        avgPerGame: number;
        total: number;
    };
    fouls: {
        avgPerGame: number;
        total: number;
    };
    momentum: {
        firstHalfGoals: number;
        secondHalfGoals: number;
    };
    topPlayers: {
        name: string;
        goals: number;
        val: number;
        shots: number;
    }[];
}

export const aggregateTeamData = (teamName: string, allMatches: MatchState[]): TeamScoutData => {
    // 1. Find matches involving the team
    const relevantMatches = allMatches.filter(m => 
        m.homeTeam.name === teamName || m.awayTeam.name === teamName
    ).slice(-5); // Analyze last 5 matches

    if (relevantMatches.length === 0) {
        throw new Error(`No match history found for team: ${teamName}`);
    }

    const scoutData: TeamScoutData = {
        teamName,
        matchCount: relevantMatches.length,
        avgGoals: 0,
        shootingEfficiency: { total: 0, near: 0, medium: 0, far: 0, penalty: 0, freeThrow: 0, runningIn: 0 },
        rebounds: { avgPerGame: 0, total: 0 },
        fouls: { avgPerGame: 0, total: 0 },
        momentum: { firstHalfGoals: 0, secondHalfGoals: 0 },
        topPlayers: []
    };

    let totalGoals = 0;
    const shotTypeStats: Record<string, { goals: number, total: number }> = {
        'NEAR': { goals: 0, total: 0 },
        'MEDIUM': { goals: 0, total: 0 },
        'FAR': { goals: 0, total: 0 },
        'PENALTY': { goals: 0, total: 0 },
        'FREE_THROW': { goals: 0, total: 0 },
        'RUNNING_IN': { goals: 0, total: 0 }
    };

    const playerStatsMap = new Map<string, { name: string, goals: number, shots: number, rebounds: number, fouls: number, turnovers: number }>();

    relevantMatches.forEach(match => {
        const teamSide: TeamId = match.homeTeam.name === teamName ? 'HOME' : 'AWAY';
        const teamObj = teamSide === 'HOME' ? match.homeTeam : match.awayTeam;
        
        // Goals & Momentum
        const matchGoals = match.events.filter(e => e.teamId === teamSide && e.result === 'GOAL');
        totalGoals += matchGoals.length;
        
        matchGoals.forEach(g => {
            if (g.half === 1) scoutData.momentum.firstHalfGoals++;
            else scoutData.momentum.secondHalfGoals++;
        });

        // Team-wide stats
        match.events.forEach(e => {
            if (e.teamId !== teamSide) return;

            // Global stats
            if (e.type === 'REBOUND') scoutData.rebounds.total++;
            if (e.type === 'FOUL') scoutData.fouls.total++;

            // Shot Types
            if (e.type === 'SHOT' && e.shotType) {
                const type = e.shotType;
                if (shotTypeStats[type]) {
                    shotTypeStats[type].total++;
                    if (e.result === 'GOAL') shotTypeStats[type].goals++;
                }
            }

            // Player aggregates
            if (e.playerId) {
                const player = teamObj.players.find(p => p.id === e.playerId);
                if (player) {
                    if (!playerStatsMap.has(e.playerId)) {
                        playerStatsMap.set(e.playerId, { name: player.name, goals: 0, shots: 0, rebounds: 0, fouls: 0, turnovers: 0 });
                    }
                    const pStat = playerStatsMap.get(e.playerId)!;
                    if (e.type === 'SHOT') {
                        pStat.shots++;
                        if (e.result === 'GOAL') pStat.goals++;
                    }
                    if (e.type === 'REBOUND') pStat.rebounds++;
                    if (e.type === 'FOUL') pStat.fouls++;
                    if (e.type === 'TURNOVER') pStat.turnovers++;
                }
            }
        });
    });

    // Calc Averages
    scoutData.avgGoals = totalGoals / scoutData.matchCount;
    scoutData.rebounds.avgPerGame = scoutData.rebounds.total / scoutData.matchCount;
    scoutData.fouls.avgPerGame = scoutData.fouls.total / scoutData.matchCount;

    // Calc Efficiency %
    const calculateEff = (goals: number, total: number) => total > 0 ? Math.round((goals / total) * 100) : 0;
    
    let totalShots = 0;
    let totalGoalsFromShots = 0;
    Object.keys(shotTypeStats).forEach(key => {
        totalShots += shotTypeStats[key].total;
        totalGoalsFromShots += shotTypeStats[key].goals;
    });

    scoutData.shootingEfficiency = {
        total: calculateEff(totalGoalsFromShots, totalShots),
        near: calculateEff(shotTypeStats['NEAR'].goals, shotTypeStats['NEAR'].total),
        medium: calculateEff(shotTypeStats['MEDIUM'].goals, shotTypeStats['MEDIUM'].total),
        far: calculateEff(shotTypeStats['FAR'].goals, shotTypeStats['FAR'].total),
        penalty: calculateEff(shotTypeStats['PENALTY'].goals, shotTypeStats['PENALTY'].total),
        freeThrow: calculateEff(shotTypeStats['FREE_THROW'].goals, shotTypeStats['FREE_THROW'].total),
        runningIn: calculateEff(shotTypeStats['RUNNING_IN'].goals, shotTypeStats['RUNNING_IN'].total),
    };

    // Calculate Top Players (by VAL)
    scoutData.topPlayers = Array.from(playerStatsMap.values()).map(p => {
        const misses = p.shots - p.goals;
        // VAL: (Goals * 5) + (Rebounds * 2) - (Misses * 1) - (Turnovers * 3) - (Fouls * 2)
        const val = (p.goals * 5) + (p.rebounds * 2) - (misses * 1) - (p.turnovers * 3) - (p.fouls * 2);
        return {
            name: p.name,
            goals: p.goals,
            val,
            shots: p.shots
        };
    }).sort((a, b) => b.val - a.val).slice(0, 5);

    return scoutData;
};
