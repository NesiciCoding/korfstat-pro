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
