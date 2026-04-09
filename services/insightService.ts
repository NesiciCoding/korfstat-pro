import { MatchState } from "../types";
import { PlayerStats, TrendPoint } from "../types/stats";
import { TeamScoutData } from "./scoutingService";
import { getScore, formatTime } from "../utils/matchUtils";
import { generateMatchInsights } from "./analysisService";

// ---------------------------------------------------------------------------
// Match Report
// ---------------------------------------------------------------------------

export const generateMatchReport = async (matchData: MatchState): Promise<string> => {
  const { homeTeam, awayTeam, events } = matchData;
  const homeGoals = events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
  const awayGoals = events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;
  const homeShots = events.filter(e => e.teamId === 'HOME' && e.type === 'SHOT').length;
  const awayShots = events.filter(e => e.teamId === 'AWAY' && e.type === 'SHOT').length;
  const homeEff = homeShots > 0 ? Math.round((homeGoals / homeShots) * 100) : 0;
  const awayEff = awayShots > 0 ? Math.round((awayGoals / awayShots) * 100) : 0;
  const homeRebounds = events.filter(e => e.teamId === 'HOME' && e.type === 'REBOUND').length;
  const awayRebounds = events.filter(e => e.teamId === 'AWAY' && e.type === 'REBOUND').length;
  const homeFouls = events.filter(e => e.teamId === 'HOME' && e.type === 'FOUL').length;
  const awayFouls = events.filter(e => e.teamId === 'AWAY' && e.type === 'FOUL').length;

  // Player stats map
  const playerMap = new Map<string, { name: string; team: string; goals: number; shots: number; rebounds: number; fouls: number; turnovers: number }>();
  events.forEach(e => {
    if (!e.playerId) return;
    const isHome = e.teamId === 'HOME';
    const player = isHome
      ? homeTeam.players.find(p => p.id === e.playerId)
      : awayTeam.players.find(p => p.id === e.playerId);
    if (!player) return;
    if (!playerMap.has(e.playerId)) {
      playerMap.set(e.playerId, { name: player.name, team: isHome ? homeTeam.name : awayTeam.name, goals: 0, shots: 0, rebounds: 0, fouls: 0, turnovers: 0 });
    }
    const s = playerMap.get(e.playerId)!;
    if (e.type === 'SHOT') { s.shots++; if (e.result === 'GOAL') s.goals++; }
    if (e.type === 'REBOUND') s.rebounds++;
    if (e.type === 'FOUL') s.fouls++;
    if (e.type === 'TURNOVER') s.turnovers++;
  });

  const allPlayers = Array.from(playerMap.values()).map(p => {
    const val = (p.goals * 5) + (p.rebounds * 2) - ((p.shots - p.goals)) - (p.turnovers * 3) - (p.fouls * 2);
    return { ...p, val, eff: p.shots > 0 ? Math.round((p.goals / p.shots) * 100) : 0 };
  });

  const topPlayers = [...allPlayers].sort((a, b) => b.val - a.val).slice(0, 3);
  const bottomPlayers = [...allPlayers].filter(p => p.shots >= 3).sort((a, b) => a.eff - b.eff).slice(0, 2);

  // Half breakdown
  const homeH1 = events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL' && e.half === 1).length;
  const homeH2 = events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL' && e.half === 2).length;
  const awayH1 = events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL' && e.half === 1).length;
  const awayH2 = events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL' && e.half === 2).length;

  // Determine result
  const winner = homeGoals > awayGoals ? homeTeam.name : awayGoals > homeGoals ? awayTeam.name : null;
  const resultLine = winner ? `**${winner}** won the match.` : 'The match ended in a draw.';

  // Insights from the existing rule-based service
  const insights = generateMatchInsights(matchData);
  const insightLines = insights.map(i => `- **${i.title}**: ${i.description}`).join('\n');

  // Tactical notes based on thresholds
  const tacticalNotes: string[] = [];
  if (homeEff < 15) tacticalNotes.push(`${homeTeam.name} will need to improve their conversion rate — ${homeEff}% is below the competitive threshold.`);
  if (awayEff < 15) tacticalNotes.push(`${awayTeam.name} struggled in front of goal at ${awayEff}% — shot selection should be reviewed.`);
  if (homeRebounds > awayRebounds * 1.5) tacticalNotes.push(`${homeTeam.name} dominated the post play with ${homeRebounds} vs ${awayRebounds} rebounds.`);
  if (awayRebounds > homeRebounds * 1.5) tacticalNotes.push(`${awayTeam.name} dominated the post play with ${awayRebounds} vs ${homeRebounds} rebounds.`);
  if (homeFouls > 6) tacticalNotes.push(`${homeTeam.name}'s discipline was a concern (${homeFouls} fouls) — this level of foul play creates dangerous free-kick opportunities.`);
  if (awayFouls > 6) tacticalNotes.push(`${awayTeam.name}'s discipline was a concern (${awayFouls} fouls).`);

  return `# Match Report: ${homeTeam.name} ${homeGoals}–${awayGoals} ${awayTeam.name}

## Summary
${resultLine} ${homeTeam.name} scored ${homeH1} goals in the first half and ${homeH2} in the second; ${awayTeam.name} scored ${awayH1} and ${awayH2} respectively.

## Key Statistics

| Metric | ${homeTeam.name} | ${awayTeam.name} |
|--------|${'-'.repeat(homeTeam.name.length + 2)}|${'-'.repeat(awayTeam.name.length + 2)}|
| Goals | ${homeGoals} | ${awayGoals} |
| Shots | ${homeShots} | ${awayShots} |
| Efficiency | ${homeEff}% | ${awayEff}% |
| Rebounds | ${homeRebounds} | ${awayRebounds} |
| Fouls | ${homeFouls} | ${awayFouls} |

## Standout Performers

${topPlayers.length > 0 ? topPlayers.map(p => `- **${p.name}** (${p.team}): ${p.goals} goal${p.goals !== 1 ? 's' : ''} from ${p.shots} shot${p.shots !== 1 ? 's' : ''} (${p.eff}%), VAL: ${p.val}`).join('\n') : '_No player data recorded._'}

${bottomPlayers.length > 0 ? `### Players to Watch\n${bottomPlayers.map(p => `- **${p.name}** (${p.team}): ${p.goals} goals from ${p.shots} shots (${p.eff}%) — below expected output`).join('\n')}` : ''}

## Match Insights

${insightLines || '_No significant patterns detected._'}

## Tactical Notes

${tacticalNotes.length > 0 ? tacticalNotes.map(n => `- ${n}`).join('\n') : '_Both teams performed within normal parameters._'}
`;
};

// ---------------------------------------------------------------------------
// Strategy Report
// ---------------------------------------------------------------------------

export const generateStrategyReport = async (teamA: string, teamB: string, matches: MatchState[]): Promise<string> => {
  const relevantMatches = matches.filter(m =>
    (m.homeTeam.name === teamA && m.awayTeam.name === teamB) ||
    (m.homeTeam.name === teamB && m.awayTeam.name === teamA)
  );

  if (relevantMatches.length === 0) {
    return `No previous match data found between **${teamA}** and **${teamB}**. Play a match first to generate a strategy report.`;
  }

  let wins = 0, losses = 0, draws = 0;
  let totalGoalsFor = 0, totalGoalsAgainst = 0;
  let totalShotsFor = 0, totalShotsAgainst = 0;
  const shotTypeFor: Record<string, { goals: number; total: number }> = {};
  const shotTypeAgainst: Record<string, { goals: number; total: number }> = {};

  const encounterLines: string[] = [];

  relevantMatches.forEach(m => {
    const isHomeA = m.homeTeam.name === teamA;
    const teamAId = isHomeA ? 'HOME' : 'AWAY';
    const teamBId = isHomeA ? 'AWAY' : 'HOME';

    const goalsA = m.events.filter(e => e.teamId === teamAId && e.result === 'GOAL').length;
    const goalsB = m.events.filter(e => e.teamId === teamBId && e.result === 'GOAL').length;
    const shotsA = m.events.filter(e => e.teamId === teamAId && e.type === 'SHOT').length;
    const shotsB = m.events.filter(e => e.teamId === teamBId && e.type === 'SHOT').length;
    const effA = shotsA > 0 ? Math.round((goalsA / shotsA) * 100) : 0;

    totalGoalsFor += goalsA; totalGoalsAgainst += goalsB;
    totalShotsFor += shotsA; totalShotsAgainst += shotsB;
    if (goalsA > goalsB) wins++; else if (goalsA < goalsB) losses++; else draws++;

    m.events.filter(e => e.teamId === teamAId && e.type === 'SHOT' && e.shotType).forEach(e => {
      const key = e.shotType!;
      if (!shotTypeFor[key]) shotTypeFor[key] = { goals: 0, total: 0 };
      shotTypeFor[key].total++;
      if (e.result === 'GOAL') shotTypeFor[key].goals++;
    });
    m.events.filter(e => e.teamId === teamBId && e.type === 'SHOT' && e.shotType).forEach(e => {
      const key = e.shotType!;
      if (!shotTypeAgainst[key]) shotTypeAgainst[key] = { goals: 0, total: 0 };
      shotTypeAgainst[key].total++;
      if (e.result === 'GOAL') shotTypeAgainst[key].goals++;
    });

    const date = new Date(m.date || Date.now()).toLocaleDateString();
    const result = goalsA > goalsB ? 'W' : goalsA < goalsB ? 'L' : 'D';
    encounterLines.push(`| ${date} | ${goalsA}–${goalsB} | ${result} | ${effA}% |`);
  });

  const n = relevantMatches.length;
  const avgGoalsFor = (totalGoalsFor / n).toFixed(1);
  const avgGoalsAgainst = (totalGoalsAgainst / n).toFixed(1);
  const overallEff = totalShotsFor > 0 ? Math.round((totalGoalsFor / totalShotsFor) * 100) : 0;
  const oppEff = totalShotsAgainst > 0 ? Math.round((totalGoalsAgainst / totalShotsAgainst) * 100) : 0;

  // Best and worst shot zones for teamA
  const bestZone = Object.entries(shotTypeFor).filter(([, v]) => v.total >= 2).sort((a, b) => (b[1].goals / b[1].total) - (a[1].goals / a[1].total))[0];
  const worstZone = Object.entries(shotTypeFor).filter(([, v]) => v.total >= 2).sort((a, b) => (a[1].goals / a[1].total) - (b[1].goals / b[1].total))[0];

  // Opponent weakest zone (where they concede most)
  const oppWeakZone = Object.entries(shotTypeFor).filter(([, v]) => v.total >= 2).sort((a, b) => (b[1].goals / b[1].total) - (a[1].goals / a[1].total))[0];

  // Tactical recommendations
  const recommendations: string[] = [];
  if (bestZone) recommendations.push(`Prioritise **${formatShotType(bestZone[0])}** attempts — ${teamA} converts ${Math.round((bestZone[1].goals / bestZone[1].total) * 100)}% from this zone against ${teamB}.`);
  if (worstZone && worstZone[0] !== bestZone?.[0]) recommendations.push(`Reduce **${formatShotType(worstZone[0])}** attempts — only ${Math.round((worstZone[1].goals / worstZone[1].total) * 100)}% conversion in this H2H.`);
  if (overallEff > oppEff) recommendations.push(`${teamA} shoots more efficiently (${overallEff}% vs ${oppEff}%) — maintain an open-play approach.`);
  else if (oppEff > overallEff) recommendations.push(`${teamB} has been more clinical — ${teamA} must tighten defensive positioning to reduce quality chances.`);
  if (wins > losses) recommendations.push(`${teamA} leads this H2H with ${wins}W/${draws}D/${losses}L — continue the current tactical approach.`);
  else if (losses > wins) recommendations.push(`${teamB} has the historical edge — ${teamA} should consider changing tempo or set-piece approach.`);

  return `# Strategy Report: ${teamA} vs ${teamB}

## Head-to-Head Record (Last ${n} encounters)

**${teamA}**: ${wins}W / ${draws}D / ${losses}L

| Date | Score (${teamA}) | Result | Efficiency |
|------|------|--------|------------|
${encounterLines.join('\n')}

## Performance Averages

| Metric | ${teamA} | ${teamB} |
|--------|${'-'.repeat(teamA.length + 2)}|${'-'.repeat(teamB.length + 2)}|
| Avg Goals | ${avgGoalsFor} | ${avgGoalsAgainst} |
| Shot Efficiency | ${overallEff}% | ${oppEff}% |

## Tactical Recommendations

${recommendations.length > 0 ? recommendations.map(r => `- ${r}`).join('\n') : '_Not enough data to make specific recommendations._'}
`;
};

// ---------------------------------------------------------------------------
// Live Commentary
// ---------------------------------------------------------------------------

const COMMENTARY_TEMPLATES: Record<string, string[]> = {
  GOAL_NEAR: [
    '{player} finds the net from close range! {team} add to their tally.',
    'Clinical finish from {player} at the near post! {score}.',
    '{player} doesn\'t miss from there — {team} are rolling now.',
  ],
  GOAL_MEDIUM: [
    '{player} with a composed finish from distance! {score}.',
    'Great technique from {player} — medium-range and it\'s a goal!',
    '{team} break through — {player} slots it from the top of the arc.',
  ],
  GOAL_FAR: [
    'From long range — {player} catches the keeper off guard! What a strike!',
    'Audacious effort from {player} and it pays off! {score}.',
    '{player} had no right to score from there, yet here we are! {team} lead.',
  ],
  GOAL_PENALTY: [
    '{player} steps up and converts the penalty. Clinical.',
    'No nerves from {player} — penalty dispatched. {score}.',
    '{team} take advantage of the set piece. {player} with the spot kick.',
  ],
  GOAL_FREE_THROW: [
    'Free throw taken quickly, {player} catches the defence napping!',
    '{player} with a well-worked free throw. {team} capitalise.',
    'Smart play from {player} on the free throw — {team} extend.',
  ],
  GOAL_RUNNING_IN: [
    '{player} runs on to the through ball and finishes! Exciting play from {team}.',
    'Pace beats the defence — {player} slots home the running-in goal!',
    '{team} break at speed and {player} takes the reward. {score}.',
  ],
  GOAL_DEFAULT: [
    '{player} scores! {team} are on the board.',
    'It\'s in! {player} finds the net for {team}. {score}.',
    'Goal! {team} convert through {player}.',
  ],
  MISS: [
    '{player} goes close but can\'t convert this time.',
    'Just wide from {player} — {team} will be disappointed.',
    'Good attempt from {player}, but the post stays intact.',
    '{team} appeal but the shot goes begging.',
  ],
  REBOUND: [
    '{team} stay alive — {player} collects the rebound.',
    'Quick thinking from {player} to keep the pressure on.',
    '{team} won\'t give up the post — {player} with another second effort.',
  ],
  FOUL: [
    'Referee stops play — {player} picks up a foul.',
    'Free kick to the opponents. {player} caught in the act.',
    '{team} concede possession with a foul. Dangerous position.',
  ],
  DEFAULT: [
    '{team} in possession, building through {player}.',
    'Action continues — {team} look to create another opportunity.',
    '{player} involved again for {team}.',
  ],
};

export const generateLiveCommentary = async (matchData: MatchState): Promise<string> => {
  const { homeTeam, awayTeam, events } = matchData;

  if (events.length === 0) return 'Match is underway — waiting for the first action.';

  const lastEvent = events[events.length - 1];
  const teamName = lastEvent.teamId === 'HOME' ? homeTeam.name : awayTeam.name;
  const player = lastEvent.teamId === 'HOME'
    ? homeTeam.players.find(p => p.id === lastEvent.playerId)
    : awayTeam.players.find(p => p.id === lastEvent.playerId);
  const playerName = player?.name || 'A player';

  const homeScore = getScore(matchData, 'HOME');
  const awayScore = getScore(matchData, 'AWAY');
  const scoreStr = `${homeTeam.name} ${homeScore}–${awayScore} ${awayTeam.name}`;

  let key = 'DEFAULT';
  if (lastEvent.type === 'SHOT') {
    if (lastEvent.result === 'GOAL') {
      key = lastEvent.shotType ? `GOAL_${lastEvent.shotType}` : 'GOAL_DEFAULT';
      if (!COMMENTARY_TEMPLATES[key]) key = 'GOAL_DEFAULT';
    } else {
      key = 'MISS';
    }
  } else if (lastEvent.type === 'REBOUND') {
    key = 'REBOUND';
  } else if (lastEvent.type === 'FOUL') {
    key = 'FOUL';
  }

  const pool = COMMENTARY_TEMPLATES[key] ?? COMMENTARY_TEMPLATES['DEFAULT'];
  // Use event id hash for deterministic-but-varied selection
  const idx = lastEvent.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % pool.length;
  const template = pool[idx];

  return template
    .replace('{player}', playerName)
    .replace('{team}', teamName)
    .replace('{score}', scoreStr);
};

// ---------------------------------------------------------------------------
// Scouting Report
// ---------------------------------------------------------------------------

const formatShotType = (key: string): string => {
  const labels: Record<string, string> = {
    NEAR: 'Near Post', MEDIUM: 'Medium Range', FAR: 'Long Range',
    PENALTY: 'Penalty', FREE_THROW: 'Free Throw', RUNNING_IN: 'Running-In',
  };
  return labels[key] ?? key;
};

const classifyEfficiency = (pct: number): string => {
  if (pct >= 25) return 'clinical';
  if (pct >= 15) return 'average';
  return 'below-average';
};

export const generateScoutingReport = async (data: TeamScoutData): Promise<string> => {
  const { teamName, matchCount, avgGoals, shootingEfficiency, rebounds, fouls, momentum, topPlayers } = data;

  // --- Executive Summary ---
  const scoringProfile = avgGoals >= 8 ? 'high-scoring' : avgGoals >= 5 ? 'mid-range' : 'low-scoring';
  const effProfile = classifyEfficiency(shootingEfficiency.total);
  const momentumProfile = momentum.firstHalfGoals > momentum.secondHalfGoals ? 'front-loaded' : momentum.secondHalfGoals > momentum.firstHalfGoals ? 'strong finishers' : 'consistent throughout';
  const foulProfile = fouls.avgPerGame > 5 ? 'prone to fouling' : fouls.avgPerGame > 3 ? 'moderately disciplined' : 'well-disciplined';

  const summary = `**${teamName}** are a ${scoringProfile} side averaging **${avgGoals.toFixed(1)} goals per game** with ${effProfile} shooting (${shootingEfficiency.total}% overall). They tend to be ${momentumProfile} and are ${foulProfile} (${fouls.avgPerGame.toFixed(1)} fouls/game). Analysis is based on ${matchCount} recent match${matchCount !== 1 ? 'es' : ''}.`;

  // --- Personnel Alert ---
  const personnelLines = topPlayers.slice(0, 3).map(p => {
    const eff = p.shots > 0 ? Math.round((p.goals / p.shots) * 100) : 0;
    const threat = eff >= 30 ? 'Highly dangerous — assign tight marking.' : eff >= 20 ? 'Active scorer — track their movement.' : 'Volume shooter — force them to lower-percentage zones.';
    return `- **${p.name}**: ${p.goals} goals from ${p.shots} shots (${eff}%), VAL: ${p.val}. _${threat}_`;
  }).join('\n');

  // --- Shot Map ---
  const sortedZones = Object.entries({
    'NEAR': shootingEfficiency.near,
    'MEDIUM': shootingEfficiency.medium,
    'FAR': shootingEfficiency.far,
    'PENALTY': shootingEfficiency.penalty,
    'FREE_THROW': shootingEfficiency.freeThrow,
    'RUNNING_IN': shootingEfficiency.runningIn,
  }).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const shotMapLines = sortedZones.map(([zone, pct]) =>
    `- **${formatShotType(zone)}**: ${pct}% efficiency ${pct >= 25 ? '⚠ Danger zone' : pct >= 15 ? '— moderate threat' : '— low threat'}`
  ).join('\n');

  const bestZone = sortedZones[0];
  const shotMapAdvice = bestZone
    ? `Prioritise defending the **${formatShotType(bestZone[0])}** corridor — this is where ${teamName} score most efficiently (${bestZone[1]}%).`
    : 'No dominant scoring zone identified — maintain a balanced defensive shape.';

  // --- Defensive Gaps ---
  const gaps: string[] = [];
  if (fouls.avgPerGame > 5) gaps.push(`High foul rate (${fouls.avgPerGame.toFixed(1)}/game) — exploit free kicks and penalties aggressively.`);
  if (rebounds.avgPerGame < 3) gaps.push(`Low post rebound rate (${rebounds.avgPerGame.toFixed(1)}/game) — second-chance opportunities are available.`);
  if (momentum.firstHalfGoals < momentum.secondHalfGoals * 0.5) gaps.push(`Slow starters — press hard in the first half to build an early lead.`);
  if (momentum.secondHalfGoals < momentum.firstHalfGoals * 0.5) gaps.push(`Second-half drop-off — maintain pressure after the break, they tend to fade.`);
  if (shootingEfficiency.far < 10 && shootingEfficiency.near > 20) gaps.push(`${teamName} rely heavily on near-post play. Push the defensive line deep to deny approach.`);
  if (gaps.length === 0) gaps.push('No significant structural weaknesses identified — focus on disrupting their transition play.');

  // --- Tactical Verdict ---
  const verdictParts: string[] = [];
  if (bestZone) verdictParts.push(`Shut down the ${formatShotType(bestZone[0])} area.`);
  if (fouls.avgPerGame > 4) verdictParts.push('Seek fouls in dangerous positions to earn set pieces.');
  if (topPlayers.length > 0) verdictParts.push(`Nullify ${topPlayers[0].name} to disrupt their scoring system.`);
  verdictParts.push(`Exploit their ${momentumProfile === 'front-loaded' ? 'second-half fatigue' : momentumProfile === 'strong finishers' ? 'slow start' : 'consistent but predictable pace'}.`);

  return `# Scouting Report: ${teamName}

## 1. Executive Summary

${summary}

## 2. Personnel Alert

${personnelLines || '_Insufficient player data._'}

## 3. Shot Map Insights

${shotMapLines || '_No shooting data available._'}

> ${shotMapAdvice}

## 4. Defensive Gaps

${gaps.map(g => `- ${g}`).join('\n')}

## 5. Tactical Verdict

${verdictParts.map(v => `- ${v}`).join('\n')}
`;
};

// ---------------------------------------------------------------------------
// Player Career Bio
// ---------------------------------------------------------------------------

export const generatePlayerCareerBio = async (player: any, stats: PlayerStats, trend: TrendPoint[]): Promise<string> => {
  const { firstName, lastName, shirtNumber } = player;
  const { matchesPlayed, goals, shootingPercentage, wins, losses, draws, milestones } = stats;
  const record = `${wins}W / ${draws}D / ${losses}L`;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  // Career archetype
  let archetype = 'utility player';
  if (shootingPercentage >= 30) archetype = 'clinical finisher';
  else if (shootingPercentage >= 20) archetype = 'reliable scorer';
  else if (goals >= 20) archetype = 'volume forward';

  // Milestone summary
  const topMilestone = milestones.sort((a, b) => {
    const order = ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
    return order.indexOf(a.tier) - order.indexOf(b.tier);
  })[0];
  const milestoneText = topMilestone
    ? ` Their standout achievement is reaching the **${topMilestone.tier} ${topMilestone.type}** milestone with a value of ${topMilestone.value}.`
    : '';

  // Recent form (last 5)
  const recent = trend.slice(-5);
  const recentGoals = recent.reduce((s, t) => s + t.goals, 0);
  const recentAvg = recent.length > 0 ? (recentGoals / recent.length).toFixed(1) : '0.0';
  const recentWins = recent.filter(t => t.result === 'W').length;

  // Trend direction
  const firstTwo = recent.slice(0, 2);
  const lastTwo = recent.slice(-2);
  const firstAvg = firstTwo.length > 0 ? firstTwo.reduce((s, t) => s + t.goals, 0) / firstTwo.length : 0;
  const lastAvg = lastTwo.length > 0 ? lastTwo.reduce((s, t) => s + t.goals, 0) / lastTwo.length : 0;
  const trendWord = lastAvg > firstAvg + 0.3 ? 'improving' : lastAvg < firstAvg - 0.3 ? 'finding their feet' : 'consistent';

  const para1 = `${firstName} ${lastName} (shirt #${shirtNumber}) has made **${matchesPlayed} appearances** and scored **${goals} goals** at a ${shootingPercentage}% shooting rate — establishing themselves as a **${archetype}** in this squad. Their career record of ${record} reflects a ${winRate >= 55 ? 'winning' : winRate >= 40 ? 'competitive' : 'developing'} pedigree across all competitions.${milestoneText}`;

  const para2 = recent.length > 0
    ? `Over their last ${recent.length} matches, ${firstName} has averaged **${recentAvg} goals per game** with ${recentWins} win${recentWins !== 1 ? 's' : ''} in that run. Their form is currently **${trendWord}**, ${trendWord === 'improving' ? 'making them a growing threat opponents must account for' : trendWord === 'consistent' ? 'offering their team reliable output match after match' : 'suggesting they are working through a transitional phase'}.`
    : `${firstName} is an emerging presence in the squad with a career accuracy of ${shootingPercentage}%. Continued minutes will be key to their development.`;

  return `${para1}\n\n${para2}`;
};
