import { MatchState, TeamId } from '../types';
import i18next from 'i18next';

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
    const t = i18next.t.bind(i18next);

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
                    title: t('stats.scoringRun', { defaultValue: 'Scoring Run' }),
                    description: t('stats.scoringRunDesc', { team: teamName, count: currentRun, defaultValue: `${teamName} had a momentum swing with ${currentRun} unanswered goals.` }),
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
            title: t('stats.scoringRun', { defaultValue: 'Scoring Run' }),
            description: t('stats.scoringRunFinalDesc', { team: teamName, count: currentRun, defaultValue: `${teamName} finished with ${currentRun} unanswered goals.` }),
            teamId: runTeam
        });
    }

    // 2. Shot Efficiency
    const homeShots = events.filter(e => e.teamId === 'HOME' && e.type === 'SHOT').length;
    const awayShots = events.filter(e => e.teamId === 'AWAY' && e.type === 'SHOT').length;

    if (homeShots > 0) {
        const homeEff = (homeGoals.length / homeShots) * 100;
        if (homeEff > 25) {
            insights.push({ 
                type: 'POSITIVE', 
                title: t('stats.highEfficiency', { defaultValue: 'High Efficiency' }), 
                description: t('stats.highEfficiencyDesc', { team: homeTeam.name, percent: Math.round(homeEff), defaultValue: `${homeTeam.name} is shooting at a high ${Math.round(homeEff)}%.` }), 
                teamId: 'HOME' 
            });
        } else if (homeEff < 10) {
            insights.push({ 
                type: 'NEGATIVE', 
                title: t('stats.shootingStruggles', { defaultValue: 'Shooting Struggles' }), 
                description: t('stats.shootingStrugglesDesc', { team: homeTeam.name, percent: Math.round(homeEff), defaultValue: `${homeTeam.name} is struggling to convert, shooting only ${Math.round(homeEff)}%.` }), 
                teamId: 'HOME' 
            });
        }
    }

    // 3. Rebound Dominance
    const homeRebounds = events.filter(e => e.teamId === 'HOME' && e.type === 'REBOUND').length;
    const awayRebounds = events.filter(e => e.teamId === 'AWAY' && e.type === 'REBOUND').length;
    const totalRebounds = homeRebounds + awayRebounds;

    if (totalRebounds > 10) {
        if (homeRebounds > awayRebounds * 2) {
            insights.push({ 
                type: 'POSITIVE', 
                title: t('stats.reboundDominance', { defaultValue: 'Rebound Dominance' }), 
                description: t('stats.reboundDominanceDesc', { team: homeTeam.name, count: homeRebounds, otherCount: awayRebounds, defaultValue: `${homeTeam.name} is controlling the post with ${homeRebounds} rebounds vs ${awayRebounds}.` }), 
                teamId: 'HOME' 
            });
        } else if (awayRebounds > homeRebounds * 2) {
            insights.push({ 
                type: 'POSITIVE', 
                title: t('stats.reboundDominance', { defaultValue: 'Rebound Dominance' }), 
                description: t('stats.reboundDominanceDesc', { team: awayTeam.name, count: awayRebounds, otherCount: homeRebounds, defaultValue: `${awayTeam.name} is controlling the post with ${awayRebounds} rebounds vs ${homeRebounds}.` }), 
                teamId: 'AWAY' 
            });
        }
    }

    return insights;
};
