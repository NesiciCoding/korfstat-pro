import { MatchState, MatchEvent, Player } from '../types';
import { PlayerStats, TrendPoint, Milestone, MilestoneTier } from '../types/stats';

export const calculatePlayerMilestones = (playerId: string, matches: MatchState[], currentStats: Omit<PlayerStats, 'milestones'>): Milestone[] => {
    const milestones: Milestone[] = [];
    const now = Date.now();

    // 1. Goal Milestones
    const goalThresholds: { threshold: number; tier: MilestoneTier }[] = [
        { threshold: 1000, tier: 'DIAMOND' },
        { threshold: 750, tier: 'PLATINUM' },
        { threshold: 500, tier: 'GOLD' },
        { threshold: 250, tier: 'SILVER' },
        { threshold: 100, tier: 'BRONZE' },
    ];

    for (const { threshold, tier } of goalThresholds) {
        if (currentStats.goals >= threshold) {
            milestones.push({
                id: `goals-${threshold}`,
                type: 'GOALS',
                tier,
                value: currentStats.goals,
                threshold,
                achievedAt: now
            });
            break; // Only show highest achieved goal tier
        }
    }

    // 2. Accuracy Milestones (Minimum 5 matches)
    if (currentStats.matchesPlayed >= 5) {
        const accuracyThresholds: { threshold: number; tier: MilestoneTier }[] = [
            { threshold: 40, tier: 'GOLD' },
            { threshold: 35, tier: 'SILVER' },
            { threshold: 30, tier: 'BRONZE' },
        ];

        for (const { threshold, tier } of accuracyThresholds) {
            if (currentStats.shootingPercentage >= threshold) {
                milestones.push({
                    id: `accuracy-${threshold}`,
                    type: 'ACCURACY',
                    tier,
                    value: currentStats.shootingPercentage,
                    threshold,
                    achievedAt: now
                });
                break;
            }
        }
    }

    // 3. Clutch Performer (Game Winning Goals)
    let gwgCount = 0;
    matches.forEach(match => {
        const homeGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
        const awayGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;
        
        // Find if this specific player scored the goal that broke the tie and secured the win
        // Simple logic: If team won by 1, find who scored the last goal. If won by more, it's more complex.
        // For simplicity, let's count goals scored when score was tied or they were down by 1 in the last 5 mins.
        const playerGoals = match.events.filter(e => e.playerId === playerId && e.type === 'SHOT' && e.result === 'GOAL');
        playerGoals.forEach(g => {
            const goalsBeforeHome = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME' && e.timestamp < g.timestamp).length;
            const goalsBeforeAway = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY' && e.timestamp < g.timestamp).length;
            
            const isHome = match.homeTeam.players.some(p => p.id === playerId);
            if (isHome && goalsBeforeHome === goalsBeforeAway && homeGoals > awayGoals) {
                gwgCount++;
            } else if (!isHome && goalsBeforeAway === goalsBeforeHome && awayGoals > homeGoals) {
                gwgCount++;
            }
        });
    });

    if (gwgCount >= 5) milestones.push({ id: 'clutch-gold', type: 'CLUTCH', tier: 'GOLD', value: gwgCount, threshold: 5, achievedAt: now });
    else if (gwgCount >= 3) milestones.push({ id: 'clutch-silver', type: 'CLUTCH', tier: 'SILVER', value: gwgCount, threshold: 3, achievedAt: now });
    else if (gwgCount >= 1) milestones.push({ id: 'clutch-bronze', type: 'CLUTCH', tier: 'BRONZE', value: gwgCount, threshold: 1, achievedAt: now });

    // 4. Iron Wall (Rebounds vs Fouls)
    const totalRebounds = matches.reduce((sum, match) => sum + match.events.filter(e => e.playerId === playerId && e.type === 'REBOUND').length, 0);
    const totalFouls = matches.reduce((sum, match) => sum + match.events.filter(e => e.playerId === playerId && e.type === 'FOUL').length, 0);
    
    if (totalRebounds > 50 && totalFouls < 10) milestones.push({ id: 'wall-gold', type: 'IRON_WALL', tier: 'GOLD', value: totalRebounds, threshold: 50, achievedAt: now });
    else if (totalRebounds > 30 && totalFouls < 15) milestones.push({ id: 'wall-silver', type: 'IRON_WALL', tier: 'SILVER', value: totalRebounds, threshold: 30, achievedAt: now });
    else if (totalRebounds > 10 && totalFouls < 20) milestones.push({ id: 'wall-bronze', type: 'IRON_WALL', tier: 'BRONZE', value: totalRebounds, threshold: 10, achievedAt: now });

    return milestones;
};

export const calculateCareerStats = (playerId: string, matches: MatchState[]): PlayerStats => {
    const baseStats: Omit<PlayerStats, 'milestones'> = {
        matchesPlayed: 0,
        goals: 0,
        shots: 0,
        shootingPercentage: 0,
        penalties: { scored: 0, missed: 0, total: 0 },
        freeKicks: { scored: 0, missed: 0, total: 0 },
        wins: 0,
        losses: 0,
        draws: 0
    };

    if (!matches || matches.length === 0) return { ...baseStats, milestones: [] };

    matches.forEach(match => {
        const isHome = match.homeTeam.players.some(p => p.id === playerId);
        const isAway = match.awayTeam.players.some(p => p.id === playerId);

        if (!isHome && !isAway) return;

        baseStats.matchesPlayed++;

        const homeGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
        const awayGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;

        if (homeGoals === awayGoals) {
            baseStats.draws++;
        } else if ((isHome && homeGoals > awayGoals) || (isAway && awayGoals > homeGoals)) {
            baseStats.wins++;
        } else {
            baseStats.losses++;
        }

        match.events.forEach(event => {
            if (event.playerId !== playerId) return;

            if (event.type === 'SHOT') {
                baseStats.shots++;
                if (event.result === 'GOAL') baseStats.goals++;

                if (event.shotType === 'PENALTY') {
                    baseStats.penalties.total++;
                    if (event.result === 'GOAL') baseStats.penalties.scored++;
                    else baseStats.penalties.missed++;
                } else if (event.shotType === 'FREE_THROW') {
                    baseStats.freeKicks.total++;
                    if (event.result === 'GOAL') baseStats.freeKicks.scored++;
                    else baseStats.freeKicks.missed++;
                }
            }
        });
    });

    baseStats.shootingPercentage = baseStats.shots > 0
        ? Math.round((baseStats.goals / baseStats.shots) * 100)
        : 0;

    const milestones = calculatePlayerMilestones(playerId, matches, baseStats);

    return { ...baseStats, milestones };
};

export const getPlayerTrend = (playerId: string, matches: MatchState[]): TrendPoint[] => {
    const trend: TrendPoint[] = [];

    matches
        .filter(m =>
            m.homeTeam.players.some(p => p.id === playerId) ||
            m.awayTeam.players.some(p => p.id === playerId)
        )
        .sort((a, b) => (a.date || 0) - (b.date || 0))
        .forEach(match => {
            const isHome = match.homeTeam.players.some(p => p.id === playerId);
            const opponentName = isHome ? match.awayTeam.name : match.homeTeam.name;

            const events = match.events.filter(e => e.playerId === playerId && e.type === 'SHOT');
            const goals = events.filter(e => e.result === 'GOAL').length;
            const accuracy = events.length > 0 ? Math.round((goals / events.length) * 100) : 0;

            const homeScore = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
            const awayScore = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;

            let result: 'W' | 'L' | 'D' = 'D';
            if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) result = 'W';
            else if (homeScore !== awayScore) result = 'L';

            trend.push({
                date: match.date || 0,
                goals,
                opponent: opponentName,
                result,
                accuracy
            });
        });

    return trend;
};

export const calculateMatchPlusMinus = (matchState: MatchState): Map<string, number> => {
    const map = new Map<string, number>();
    const currentHomeLineup = new Set<string>();
    const currentAwayLineup = new Set<string>();

    matchState.homeTeam.players.forEach(p => { if (p.isStarter) currentHomeLineup.add(p.id); map.set(p.id, 0); });
    matchState.awayTeam.players.forEach(p => { if (p.isStarter) currentAwayLineup.add(p.id); map.set(p.id, 0); });

    const sortedEvents = [...matchState.events].sort((a, b) => a.timestamp - b.timestamp);

    sortedEvents.forEach(e => {
        if (e.type === 'SUBSTITUTION' && e.subInId && e.subOutId) {
            if (e.teamId === 'HOME') {
                currentHomeLineup.delete(e.subOutId);
                currentHomeLineup.add(e.subInId);
            } else {
                currentAwayLineup.delete(e.subOutId);
                currentAwayLineup.add(e.subInId);
            }
        }

        if (e.type === 'SHOT' && e.result === 'GOAL') {
            if (e.teamId === 'HOME') {
                currentHomeLineup.forEach(pid => map.set(pid, (map.get(pid) || 0) + 1));
                currentAwayLineup.forEach(pid => map.set(pid, (map.get(pid) || 0) - 1));
            } else {
                currentAwayLineup.forEach(pid => map.set(pid, (map.get(pid) || 0) + 1));
                currentHomeLineup.forEach(pid => map.set(pid, (map.get(pid) || 0) - 1));
            }
        }
    });

    return map;
};

export const calculatePlayerMatchStats = (team: any, matchState: MatchState, plusMinusMap: Map<string, number>) => {
    return team.players.map((player: any) => {
        const events = matchState.events.filter((e: MatchEvent) => e.playerId === player.id);
        const shots = events.filter((e: MatchEvent) => e.type === 'SHOT');
        const goals = shots.filter((e: MatchEvent) => e.result === 'GOAL');
        const rebounds = events.filter((e: MatchEvent) => e.type === 'REBOUND');
        const fouls = events.filter((e: MatchEvent) => e.type === 'FOUL');
        const turnovers = events.filter((e: MatchEvent) => e.type === 'TURNOVER');

        const misses = shots.length - goals.length;
        const rating = (goals.length * 5) + (rebounds.length * 2) - (misses * 1) - (turnovers.length * 3) - (fouls.length * 2);

        return {
            ...player,
            shots: shots.length,
            goals: goals.length,
            percentage: shots.length > 0 ? Math.round((goals.length / shots.length) * 100) : 0,
            rebounds: rebounds.length,
            fouls: fouls.length,
            rating,
            plusMinus: plusMinusMap.get(player.id) || 0,
            shotTypes: {
                short: shots.filter((s: MatchEvent) => s.shotType === 'NEAR').length,
                medium: shots.filter((s: MatchEvent) => s.shotType === 'MEDIUM').length,
                long: shots.filter((s: MatchEvent) => s.shotType === 'FAR').length,
                pen: shots.filter((s: MatchEvent) => s.shotType === 'PENALTY' || s.shotType === 'FREE_THROW').length,
            }
        };
    }).sort((a: any, b: any) => b.rating - a.rating);
};
