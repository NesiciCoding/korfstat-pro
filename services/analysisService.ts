import { MatchState, TeamId } from '../types';

export interface MatchInsight {
    type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    title: string;
    description: string;
    teamId?: TeamId;
}

export const generateMatchInsights = (matchState: MatchState): MatchInsight[] => {
    if (!matchState || !matchState.events) return [];
    const insights: MatchInsight[] = [];
    const { homeTeam, awayTeam, events } = matchState;

    const homeGoals = events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL');
    const awayGoals = events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL');

    // 1. Scoring Runs (3+ consecutive goals)
    let currentRun = 0;
    let runTeam: TeamId | null = null;

    const scoringEvents = events
        .filter(e => e.type === 'SHOT' && e.result === 'GOAL')
        .sort((a, b) => a.timestamp - b.timestamp);

    scoringEvents.forEach(e => {
        if (e.teamId === runTeam) {
            currentRun++;
        } else {
            if (currentRun >= 3 && runTeam) {
                const teamName = runTeam === 'HOME' ? homeTeam.name : awayTeam.name;
                insights.push({
                    type: 'POSITIVE',
                    title: 'Scoring Run',
                    description: `${teamName} had a momentum swing with ${currentRun} unanswered goals.`,
                    teamId: runTeam
                });
            }
            currentRun = 1;
            runTeam = e.teamId;
        }
    });
    // Check final run
    if (currentRun >= 3 && runTeam) {
        const teamName = runTeam === 'HOME' ? homeTeam.name : awayTeam.name;
        insights.push({
            type: 'POSITIVE',
            title: 'Scoring Run',
            description: `${teamName} finished with ${currentRun} unanswered goals.`,
            teamId: runTeam
        });
    }

    // 2. Shot Efficiency
    const homeShots = events.filter(e => e.teamId === 'HOME' && e.type === 'SHOT').length;
    const awayShots = events.filter(e => e.teamId === 'AWAY' && e.type === 'SHOT').length;

    if (homeShots > 0) {
        const homeEff = (homeGoals.length / homeShots) * 100;
        if (homeEff > 25) {
            insights.push({ type: 'POSITIVE', title: 'High Efficiency', description: `${homeTeam.name} is shooting at a high ${Math.round(homeEff)}%.`, teamId: 'HOME' });
        } else if (homeEff < 10) {
            insights.push({ type: 'NEGATIVE', title: 'Shooting Struggles', description: `${homeTeam.name} is struggling to convert, shooting only ${Math.round(homeEff)}%.`, teamId: 'HOME' });
        }
    }

    // 3. Rebound Dominance
    const homeRebounds = events.filter(e => e.teamId === 'HOME' && e.type === 'REBOUND').length;
    const awayRebounds = events.filter(e => e.teamId === 'AWAY' && e.type === 'REBOUND').length;
    const totalRebounds = homeRebounds + awayRebounds;

    if (totalRebounds > 10) {
        if (homeRebounds > awayRebounds * 2) {
            insights.push({ type: 'POSITIVE', title: 'Rebound Dominance', description: `${homeTeam.name} is controlling the post with ${homeRebounds} rebounds vs ${awayRebounds}.`, teamId: 'HOME' });
        } else if (awayRebounds > homeRebounds * 2) {
            insights.push({ type: 'POSITIVE', title: 'Rebound Dominance', description: `${awayTeam.name} is controlling the post with ${awayRebounds} rebounds vs ${homeRebounds}.`, teamId: 'AWAY' });
        }
    }

    return insights;
};
