import { MatchState, MatchEvent, Player } from '../types';
import { PlayerStats, TrendPoint, Milestone, MilestoneTier, PlayerArchetype } from '../types/stats';

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
    const totalFoulsForWall = matches.reduce((sum, match) => sum + match.events.filter(e => e.playerId === playerId && e.type === 'FOUL').length, 0);

    if (totalRebounds > 50 && totalFoulsForWall < 10) milestones.push({ id: 'wall-gold', type: 'IRON_WALL', tier: 'GOLD', value: totalRebounds, threshold: 50, achievedAt: now });
    else if (totalRebounds > 30 && totalFoulsForWall < 15) milestones.push({ id: 'wall-silver', type: 'IRON_WALL', tier: 'SILVER', value: totalRebounds, threshold: 30, achievedAt: now });
    else if (totalRebounds > 10 && totalFoulsForWall < 20) milestones.push({ id: 'wall-bronze', type: 'IRON_WALL', tier: 'BRONZE', value: totalRebounds, threshold: 10, achievedAt: now });

    // 5. Rebounds milestone
    for (const { threshold, tier } of [{ threshold: 200, tier: 'GOLD' as const }, { threshold: 75, tier: 'SILVER' as const }, { threshold: 25, tier: 'BRONZE' as const }]) {
        if (currentStats.rebounds >= threshold) {
            milestones.push({ id: `rebounds-${threshold}`, type: 'REBOUNDS', tier, value: currentStats.rebounds, threshold, achievedAt: now });
            break;
        }
    }

    // 6. Consistency milestone (longestGoalStreak)
    for (const { threshold, tier } of [{ threshold: 10, tier: 'GOLD' as const }, { threshold: 5, tier: 'SILVER' as const }, { threshold: 3, tier: 'BRONZE' as const }]) {
        if (currentStats.longestGoalStreak >= threshold) {
            milestones.push({ id: `consistency-${threshold}`, type: 'CONSISTENCY', tier, value: currentStats.longestGoalStreak, threshold, achievedAt: now });
            break;
        }
    }

    // 7. Sharpshooter milestone (min 10 matches, higher bar than ACCURACY)
    if (currentStats.matchesPlayed >= 10) {
        for (const { threshold, tier } of [{ threshold: 45, tier: 'GOLD' as const }, { threshold: 40, tier: 'SILVER' as const }, { threshold: 35, tier: 'BRONZE' as const }]) {
            if (currentStats.shootingPercentage >= threshold) {
                milestones.push({ id: `sharp-${threshold}`, type: 'SHARPSHOOTER', tier, value: currentStats.shootingPercentage, threshold, achievedAt: now });
                break;
            }
        }
    }

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
        draws: 0,
        // Extended stats
        rebounds: 0,
        turnovers: 0,
        yellowCards: 0,
        redCards: 0,
        careerRating: 0,
        goalsPerMatch: 0,
        goalsFirstHalf: 0,
        goalsSecondHalf: 0,
        shotsByType: {
            NEAR: { shots: 0, goals: 0 },
            MEDIUM: { shots: 0, goals: 0 },
            FAR: { shots: 0, goals: 0 },
            RUNNING_IN: { shots: 0, goals: 0 },
            PENALTY: { shots: 0, goals: 0 },
            FREE_THROW: { shots: 0, goals: 0 },
        },
        bestMatch: null,
        currentGoalStreak: 0,
        longestGoalStreak: 0,
        careerPlusMinus: 0,
        archetype: 'VERSATILE' as PlayerArchetype,
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

            if (event.type === 'REBOUND') baseStats.rebounds++;
            if (event.type === 'TURNOVER') baseStats.turnovers++;
            if (event.type === 'CARD') {
                if (event.cardType === 'YELLOW') baseStats.yellowCards++;
                if (event.cardType === 'RED') baseStats.redCards++;
            }

            if (event.type === 'SHOT') {
                baseStats.shots++;
                if (event.result === 'GOAL') {
                    baseStats.goals++;
                    if (event.half === 1) baseStats.goalsFirstHalf++;
                    if (event.half === 2) baseStats.goalsSecondHalf++;
                }

                if (event.shotType) {
                    baseStats.shotsByType[event.shotType].shots++;
                    if (event.result === 'GOAL') baseStats.shotsByType[event.shotType].goals++;
                }

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

        // Best match tracking
        const matchGoals = match.events.filter(e => e.playerId === playerId && e.type === 'SHOT' && e.result === 'GOAL').length;
        const matchShots = match.events.filter(e => e.playerId === playerId && e.type === 'SHOT').length;
        if (baseStats.bestMatch === null || matchGoals > baseStats.bestMatch.goals) {
            baseStats.bestMatch = {
                goals: matchGoals,
                accuracy: matchShots > 0 ? Math.round((matchGoals / matchShots) * 100) : 0,
                opponent: isHome ? match.awayTeam.name : match.homeTeam.name,
                date: match.date || 0,
            };
        }

        // Career plus/minus accumulation
        const pmMap = calculateMatchPlusMinus(match);
        baseStats.careerPlusMinus += pmMap.get(playerId) || 0;
    });

    baseStats.shootingPercentage = baseStats.shots > 0
        ? Math.round((baseStats.goals / baseStats.shots) * 100)
        : 0;

    // Derived rate stats
    baseStats.goalsPerMatch = baseStats.matchesPlayed > 0
        ? parseFloat((baseStats.goals / baseStats.matchesPlayed).toFixed(2))
        : 0;

    // VAL rating: (goals×5 + rebounds×2 - misses - turnovers×3 - fouls×2) / matchesPlayed
    const totalFouls = matches.reduce((sum, m) =>
        sum + m.events.filter(e => e.playerId === playerId && e.type === 'FOUL').length, 0);
    const misses = baseStats.shots - baseStats.goals;
    const rawVal = (baseStats.goals * 5) + (baseStats.rebounds * 2) - misses
        - (baseStats.turnovers * 3) - (totalFouls * 2);
    baseStats.careerRating = baseStats.matchesPlayed > 0
        ? parseFloat((rawVal / baseStats.matchesPlayed).toFixed(1))
        : 0;

    // Streak calculation (two-pass, date-sorted)
    const playerMatches = matches
        .filter(m =>
            m.homeTeam.players.some(p => p.id === playerId) ||
            m.awayTeam.players.some(p => p.id === playerId)
        )
        .sort((a, b) => (a.date || 0) - (b.date || 0));

    // Forward pass: longest streak
    let longestStreak = 0;
    let runningStreak = 0;
    for (const m of playerMatches) {
        if (m.events.some(e => e.playerId === playerId && e.type === 'SHOT' && e.result === 'GOAL')) {
            runningStreak++;
            if (runningStreak > longestStreak) longestStreak = runningStreak;
        } else {
            runningStreak = 0;
        }
    }
    baseStats.longestGoalStreak = longestStreak;

    // Backward pass: current streak
    let currentStreak = 0;
    for (let i = playerMatches.length - 1; i >= 0; i--) {
        if (playerMatches[i].events.some(e => e.playerId === playerId && e.type === 'SHOT' && e.result === 'GOAL')) {
            currentStreak++;
        } else {
            break;
        }
    }
    baseStats.currentGoalStreak = currentStreak;

    // Archetype determination (evaluated in strict priority order)
    let gwgCount = 0;
    matches.forEach(match => {
        const homeGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
        const awayGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;
        const isHomeForGwg = match.homeTeam.players.some(p => p.id === playerId);
        match.events
            .filter(e => e.playerId === playerId && e.type === 'SHOT' && e.result === 'GOAL')
            .forEach(g => {
                const gbh = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME' && e.timestamp < g.timestamp).length;
                const gba = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY' && e.timestamp < g.timestamp).length;
                if (isHomeForGwg && gbh === gba && homeGoals > awayGoals) gwgCount++;
                else if (!isHomeForGwg && gba === gbh && awayGoals > homeGoals) gwgCount++;
            });
    });

    const turnoversPerTen = baseStats.matchesPlayed > 0
        ? (baseStats.turnovers / baseStats.matchesPlayed) * 10
        : 0;

    let archetype: PlayerArchetype = 'VERSATILE';
    if (baseStats.goals >= 30 && baseStats.shootingPercentage >= 35) {
        archetype = 'SCORING_MACHINE';
    } else if (baseStats.rebounds >= 40 && baseStats.rebounds > baseStats.goals * 2) {
        archetype = 'IRON_WALL';
    } else if (gwgCount >= 3) {
        archetype = 'CLUTCH_PERFORMER';
    } else if (baseStats.careerPlusMinus > 10 && turnoversPerTen < 5) {
        archetype = 'PLAYMAKER';
    } else if (baseStats.matchesPlayed <= 8 && baseStats.goalsPerMatch >= 1.0) {
        archetype = 'RISING_STAR';
    }
    baseStats.archetype = archetype;

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

            const shotEvents = match.events.filter(e => e.playerId === playerId && e.type === 'SHOT');
            const goals = shotEvents.filter(e => e.result === 'GOAL').length;
            const shots = shotEvents.length;
            const accuracy = shots > 0 ? Math.round((goals / shots) * 100) : 0;

            const rebounds = match.events.filter(e => e.playerId === playerId && e.type === 'REBOUND').length;
            const matchFouls = match.events.filter(e => e.playerId === playerId && e.type === 'FOUL').length;
            const matchTurnovers = match.events.filter(e => e.playerId === playerId && e.type === 'TURNOVER').length;
            const matchMisses = shots - goals;
            const rating = parseFloat(((goals * 5) + (rebounds * 2) - matchMisses - (matchTurnovers * 3) - (matchFouls * 2)).toFixed(1));

            const pmMap = calculateMatchPlusMinus(match);
            const plusMinus = pmMap.get(playerId) || 0;

            const homeScore = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
            const awayScore = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;

            let result: 'W' | 'L' | 'D' = 'D';
            if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) result = 'W';
            else if (homeScore !== awayScore) result = 'L';

            trend.push({
                date: match.date || 0,
                goals,
                shots,
                rebounds,
                plusMinus,
                rating,
                opponent: opponentName,
                result,
                accuracy,
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
