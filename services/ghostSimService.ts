import { MatchState, ShotType } from '../types';
import { aggregateTeamData } from './scoutingService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GhostTeamProfile {
  /** Average shots taken per minute (Poisson rate) */
  shotRatePerMinute: number;
  /** Probability weight for each shot zone (sums to 1) */
  zoneWeights: Record<ShotType, number>;
  /** Goal conversion rate per zone (0–1) */
  zoneEfficiency: Record<ShotType, number>;
  /** Multiplicative boost applied to conversion when a scoring run is active (1.0 = none) */
  momentumBoost: number;
}

export interface GhostConfig {
  home: GhostTeamProfile;
  away: GhostTeamProfile;
  currentHomeScore: number;
  currentAwayScore: number;
  /** Simulated seconds left in the match */
  remainingSeconds: number;
  /** Match clock second at which this config was built (used as LCG seed) */
  triggeredAtSecond: number;
}

export interface SimulationResult {
  homeWinPct: number;
  awayWinPct: number;
  drawPct: number;
  /** Modal (most frequent) projected home final score */
  projectedHomeScore: number;
  /** Modal (most frequent) projected away final score */
  projectedAwayScore: number;
  scoreCloud: Array<{ home: number; away: number; count: number; pct: number }>;
  simCount: number;
  triggeredAtSecond: number;
}

// ─── Korfball cold-start defaults ─────────────────────────────────────────────
// Based on typical competitive Korfball statistics.

const DEFAULT_SHOT_RATE = 0.5; // shots/minute

const DEFAULT_ZONE_WEIGHTS: Record<ShotType, number> = {
  NEAR: 0.35,
  MEDIUM: 0.25,
  FAR: 0.10,
  PENALTY: 0.10,
  FREE_THROW: 0.12,
  RUNNING_IN: 0.08,
};

const DEFAULT_ZONE_EFFICIENCY: Record<ShotType, number> = {
  NEAR: 0.35,
  MEDIUM: 0.22,
  FAR: 0.08,
  PENALTY: 0.70,
  FREE_THROW: 0.60,
  RUNNING_IN: 0.45,
};

const ZONES: ShotType[] = ['NEAR', 'MEDIUM', 'FAR', 'PENALTY', 'FREE_THROW', 'RUNNING_IN'];

// ─── Deterministic LCG ───────────────────────────────────────────────────────

function makeLCG(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectWeighted(weights: Record<ShotType, number>, rand: () => number): ShotType {
  const r = rand();
  let cumulative = 0;
  for (const zone of ZONES) {
    cumulative += weights[zone];
    if (r < cumulative) return zone;
  }
  return ZONES[ZONES.length - 1];
}

function normalizeWeights(raw: Record<ShotType, number>): Record<ShotType, number> {
  const total = ZONES.reduce((sum, z) => sum + raw[z], 0);
  if (total === 0) return { ...DEFAULT_ZONE_WEIGHTS };
  const result = {} as Record<ShotType, number>;
  ZONES.forEach(z => { result[z] = raw[z] / total; });
  return result;
}

/** Blend two values: `w` weight on `a`, `(1-w)` weight on `b`. */
function blend(a: number, b: number, w: number): number {
  return a * w + b * (1 - w);
}

// ─── Build per-team profile from historical + current match data ───────────────

function buildTeamProfile(
  teamName: string,
  teamSide: 'HOME' | 'AWAY',
  matchState: MatchState,
  historicalMatches: MatchState[],
): GhostTeamProfile {
  const halfMinutes = matchState.halfDurationSeconds / 60;
  const matchMinutes = halfMinutes * 2;

  // ── 1. Historical base rates ──────────────────────────────────────────────

  let histShotRate = DEFAULT_SHOT_RATE;
  let histZoneWeights: Record<ShotType, number> = { ...DEFAULT_ZONE_WEIGHTS };
  let histZoneEfficiency: Record<ShotType, number> = { ...DEFAULT_ZONE_EFFICIENCY };

  try {
    const scout = aggregateTeamData(teamName, historicalMatches);

    // Shot rate: avgGoals / efficiency → avgShots / matchMinutes
    const totalEffPct = scout.shootingEfficiency.total;
    if (totalEffPct > 0 && scout.avgGoals > 0) {
      const avgShots = scout.avgGoals / (totalEffPct / 100);
      histShotRate = avgShots / matchMinutes;
    }

    // Zone efficiency (0–100 → 0–1, default 0 zones to cold-start)
    const eff = scout.shootingEfficiency;
    histZoneEfficiency = {
      NEAR: eff.near > 0 ? eff.near / 100 : DEFAULT_ZONE_EFFICIENCY.NEAR,
      MEDIUM: eff.medium > 0 ? eff.medium / 100 : DEFAULT_ZONE_EFFICIENCY.MEDIUM,
      FAR: eff.far > 0 ? eff.far / 100 : DEFAULT_ZONE_EFFICIENCY.FAR,
      PENALTY: eff.penalty > 0 ? eff.penalty / 100 : DEFAULT_ZONE_EFFICIENCY.PENALTY,
      FREE_THROW: eff.freeThrow > 0 ? eff.freeThrow / 100 : DEFAULT_ZONE_EFFICIENCY.FREE_THROW,
      RUNNING_IN: eff.runningIn > 0 ? eff.runningIn / 100 : DEFAULT_ZONE_EFFICIENCY.RUNNING_IN,
    };

    // Zone weights: count shot attempts per zone across historical matches
    const zoneCounts: Record<ShotType, number> = {
      NEAR: 0, MEDIUM: 0, FAR: 0, PENALTY: 0, FREE_THROW: 0, RUNNING_IN: 0,
    };
    const relevantMatches = historicalMatches
      .filter(m => m.homeTeam.name === teamName || m.awayTeam.name === teamName)
      .slice(-5);
    relevantMatches.forEach(m => {
      const side: 'HOME' | 'AWAY' = m.homeTeam.name === teamName ? 'HOME' : 'AWAY';
      m.events.forEach(e => {
        if (e.teamId === side && e.type === 'SHOT' && e.shotType && e.shotType in zoneCounts) {
          zoneCounts[e.shotType as ShotType]++;
        }
      });
    });
    histZoneWeights = normalizeWeights(zoneCounts);
  } catch {
    // No historical data — use Korfball defaults
  }

  // ── 2. Current-match rolling (last 15 match-minutes of events) ─────────────

  const rollingWindowSeconds = 15 * 60;
  const currentElapsed = matchState.timer.elapsedSeconds;
  const windowStart = Math.max(0, currentElapsed - rollingWindowSeconds);

  const currentEvents = matchState.events.filter(
    e => e.teamId === teamSide && e.type === 'SHOT' && e.timestamp >= windowStart,
  );

  let rollShotRate = histShotRate;
  let rollZoneWeights = histZoneWeights;
  let rollZoneEfficiency = histZoneEfficiency;

  if (currentEvents.length >= 3) {
    // Rate
    const windowMinutes = Math.max(1, (currentElapsed - windowStart) / 60);
    rollShotRate = currentEvents.length / windowMinutes;

    // Zone weights from rolling attempts
    const rollingCounts: Record<ShotType, number> = {
      NEAR: 0, MEDIUM: 0, FAR: 0, PENALTY: 0, FREE_THROW: 0, RUNNING_IN: 0,
    };
    currentEvents.forEach(e => {
      if (e.shotType && e.shotType in rollingCounts) rollingCounts[e.shotType as ShotType]++;
    });
    rollZoneWeights = normalizeWeights(rollingCounts);

    // Rolling efficiency per zone
    const rollingZoneEff = { ...histZoneEfficiency };
    ZONES.forEach(zone => {
      const zoneShots = currentEvents.filter(e => e.shotType === zone);
      if (zoneShots.length >= 2) {
        const goals = zoneShots.filter(e => e.result === 'GOAL').length;
        rollingZoneEff[zone] = goals / zoneShots.length;
      }
    });
    rollZoneEfficiency = rollingZoneEff;
  }

  // ── 3. Blend historical (70%) with rolling (30%) ──────────────────────────

  const HIST_WEIGHT = 0.70;

  const finalShotRate = blend(histShotRate, rollShotRate, HIST_WEIGHT);
  const finalZoneWeights = normalizeWeights(
    Object.fromEntries(
      ZONES.map(z => [z, blend(histZoneWeights[z], rollZoneWeights[z], HIST_WEIGHT)]),
    ) as Record<ShotType, number>,
  );
  const finalZoneEfficiency: Record<ShotType, number> = Object.fromEntries(
    ZONES.map(z => [z, blend(histZoneEfficiency[z], rollZoneEfficiency[z], HIST_WEIGHT)]),
  ) as Record<ShotType, number>;

  // ── 4. Fatigue decay (after 35 match-minutes) ─────────────────────────────

  const totalElapsed =
    (matchState.currentHalf - 1) * matchState.halfDurationSeconds + currentElapsed;

  if (totalElapsed > 35 * 60) {
    ZONES.forEach(z => { finalZoneEfficiency[z] *= 0.95; });
  }

  // ── 5. Momentum boost (3+ consecutive goals by this team in last 6 shots) ──

  const lastShots = [...matchState.events]
    .filter(e => e.type === 'SHOT')
    .slice(-6);

  let streak = 0;
  for (let i = lastShots.length - 1; i >= 0; i--) {
    if (lastShots[i].teamId === teamSide && lastShots[i].result === 'GOAL') {
      streak++;
    } else {
      break;
    }
  }
  const momentumBoost = streak >= 3 ? 1.15 : 1.0;

  return {
    shotRatePerMinute: Math.max(0.05, finalShotRate),
    zoneWeights: finalZoneWeights,
    zoneEfficiency: finalZoneEfficiency,
    momentumBoost,
  };
}

// ─── Public: build config ────────────────────────────────────────────────────

export function buildGhostConfig(
  matchState: MatchState,
  historicalMatches: MatchState[],
): GhostConfig {
  const homeProfile = buildTeamProfile(
    matchState.homeTeam.name,
    'HOME',
    matchState,
    historicalMatches,
  );
  const awayProfile = buildTeamProfile(
    matchState.awayTeam.name,
    'AWAY',
    matchState,
    historicalMatches,
  );

  // Current score from events
  const events = matchState.events;
  const currentHomeScore = events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
  const currentAwayScore = events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

  // Remaining seconds
  const totalElapsed =
    (matchState.currentHalf - 1) * matchState.halfDurationSeconds +
    matchState.timer.elapsedSeconds;
  const totalDuration = matchState.halfDurationSeconds * 2;
  const remainingSeconds = Math.max(0, totalDuration - totalElapsed);

  return {
    home: homeProfile,
    away: awayProfile,
    currentHomeScore,
    currentAwayScore,
    remainingSeconds,
    triggeredAtSecond: matchState.timer.elapsedSeconds,
  };
}

// ─── Public: run simulations ─────────────────────────────────────────────────

export function runSimulations(config: GhostConfig, n = 10000): SimulationResult {
  const rand = makeLCG(config.triggeredAtSecond * 1000 + config.remainingSeconds);

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  const outcomeCounts = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    let homeGoals = config.currentHomeScore;
    let awayGoals = config.currentAwayScore;
    let t = 0;

    const totalRate =
      (config.home.shotRatePerMinute + config.away.shotRatePerMinute) / 60;

    if (totalRate > 0 && config.remainingSeconds > 0) {
      while (t < config.remainingSeconds) {
        // Time until next shot (exponential inter-arrival)
        const dt = -Math.log(Math.max(1e-10, rand())) / totalRate;
        t += dt;
        if (t >= config.remainingSeconds) break;

        // Team selection (proportional to shot rate)
        const isHome =
          rand() <
          config.home.shotRatePerMinute /
            (config.home.shotRatePerMinute + config.away.shotRatePerMinute);

        const profile = isHome ? config.home : config.away;

        // Zone selection
        const zone = selectWeighted(profile.zoneWeights, rand);

        // Shot result
        const efficiency = Math.min(1, profile.zoneEfficiency[zone] * profile.momentumBoost);
        if (rand() < efficiency) {
          if (isHome) homeGoals++;
          else awayGoals++;
        }
      }
    }

    // Tally outcome
    if (homeGoals > awayGoals) homeWins++;
    else if (awayGoals > homeGoals) awayWins++;
    else draws++;

    const key = `${homeGoals},${awayGoals}`;
    outcomeCounts.set(key, (outcomeCounts.get(key) ?? 0) + 1);
  }

  // Build score cloud (sorted by frequency)
  const scoreCloud = Array.from(outcomeCounts.entries())
    .map(([key, count]) => {
      const [home, away] = key.split(',').map(Number);
      return { home, away, count, pct: (count / n) * 100 };
    })
    .sort((a, b) => b.count - a.count);

  // Modal outcome
  const modal = scoreCloud[0] ?? {
    home: config.currentHomeScore,
    away: config.currentAwayScore,
  };

  return {
    homeWinPct: (homeWins / n) * 100,
    awayWinPct: (awayWins / n) * 100,
    drawPct: (draws / n) * 100,
    projectedHomeScore: modal.home,
    projectedAwayScore: modal.away,
    scoreCloud,
    simCount: n,
    triggeredAtSecond: config.triggeredAtSecond,
  };
}
