import { MatchState, MatchEvent, Player } from '../types';

export interface PlayerStats {
    matchesPlayed: number;
    goals: number;
    shots: number; // Total attempts (goals + misses)
    shootingPercentage: number;
    penalties: {
        scored: number;
        missed: number;
        total: number;
    };
    freeKicks: {
        scored: number;
        missed: number;
        total: number;
    };
    wins: number;
    losses: number;
    draws: number;
}

export const calculateCareerStats = (playerId: string, matches: MatchState[]): PlayerStats => {
    const stats: PlayerStats = {
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

    if (!matches || matches.length === 0) return stats;

    matches.forEach(match => {
        // 1. Check if player participated
        const isHome = match.homeTeam.players.some(p => p.id === playerId);
        const isAway = match.awayTeam.players.some(p => p.id === playerId);

        if (!isHome && !isAway) return;

        stats.matchesPlayed++;

        // 2. Determine Match Result for the player
        const homeGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
        const awayGoals = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;

        if (homeGoals === awayGoals) {
            stats.draws++;
        } else if ((isHome && homeGoals > awayGoals) || (isAway && awayGoals > homeGoals)) {
            stats.wins++;
        } else {
            stats.losses++;
        }

        // 3. Aggregate Player Events
        match.events.forEach(event => {
            if (event.playerId !== playerId) return;

            if (event.type === 'SHOT') {
                stats.shots++;

                if (event.result === 'GOAL') {
                    stats.goals++;
                }

                if (event.shotType === 'PENALTY') {
                    stats.penalties.total++;
                    if (event.result === 'GOAL') stats.penalties.scored++;
                    else stats.penalties.missed++;
                } else if (event.shotType === 'FREE_THROW') {
                    stats.freeKicks.total++;
                    if (event.result === 'GOAL') stats.freeKicks.scored++;
                    else stats.freeKicks.missed++;
                }
            }
        });
    });

    // 4. Calculate Derived Stats
    stats.shootingPercentage = stats.shots > 0
        ? Math.round((stats.goals / stats.shots) * 100)
        : 0;

    return stats;
};

export interface TrendPoint {
    date: number;
    goals: number;
    opponent: string;
    result: 'W' | 'L' | 'D';
}

export const getPlayerTrend = (playerId: string, matches: MatchState[]): TrendPoint[] => {
    const trend: TrendPoint[] = [];

    matches
        .filter(m =>
            m.homeTeam.players.some(p => p.id === playerId) ||
            m.awayTeam.players.some(p => p.id === playerId)
        )
        .sort((a, b) => (a.date || 0) - (b.date || 0)) // Sort by date
        .forEach(match => {
            const isHome = match.homeTeam.players.some(p => p.id === playerId);
            const opponentName = isHome ? match.awayTeam.name : match.homeTeam.name;

            // Calculate goals in this match
            const goals = match.events.filter(e => e.playerId === playerId && e.type === 'SHOT' && e.result === 'GOAL').length;

            // Result
            const homeScore = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
            const awayScore = match.events.filter(e => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;

            let result: 'W' | 'L' | 'D' = 'D';
            if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) result = 'W';
            else if (homeScore !== awayScore) result = 'L';

            trend.push({
                date: match.date || 0,
                goals,
                opponent: opponentName,
                result
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
                if (!map.has(e.subInId)) map.set(e.subInId, 0);
            } else {
                currentAwayLineup.delete(e.subOutId);
                currentAwayLineup.add(e.subInId);
                if (!map.has(e.subInId)) map.set(e.subInId, 0);
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
