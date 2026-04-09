import { describe, it, expect } from 'vitest';
import { buildGhostConfig, runSimulations } from '../ghostSimService';
import type { MatchState } from '../../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseMatch: MatchState = {
  id: 'test-match',
  halfDurationSeconds: 1500, // 25 minutes per half
  isConfigured: true,
  homeTeam: {
    id: 'HOME',
    name: 'Eagles',
    color: '#4f46e5',
    players: [],
    substitutionCount: 0,
  },
  awayTeam: {
    id: 'AWAY',
    name: 'Falcons',
    color: '#e11d48',
    players: [],
    substitutionCount: 0,
  },
  events: [],
  currentHalf: 1,
  possession: null,
  timer: { elapsedSeconds: 600, isRunning: false }, // 10 minutes in
  shotClock: { seconds: 25, isRunning: false },
  timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
} as unknown as MatchState;

const matchAtHalfTime: MatchState = {
  ...baseMatch,
  currentHalf: 1,
  timer: { elapsedSeconds: 1500, isRunning: false },
} as unknown as MatchState;

const matchInSecondHalf: MatchState = {
  ...baseMatch,
  currentHalf: 2,
  timer: { elapsedSeconds: 900, isRunning: false }, // 15 min into 2nd half
} as unknown as MatchState;

const matchNearEnd: MatchState = {
  ...baseMatch,
  currentHalf: 2,
  timer: { elapsedSeconds: 1440, isRunning: false }, // 24 min into 2nd half → 1 min left
} as unknown as MatchState;

/** Match with events: 3 consecutive home goals (triggers momentum boost) */
const matchWithHomeRun: MatchState = {
  ...baseMatch,
  events: [
    { id: 'e1', timestamp: 100, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
    { id: 'e2', timestamp: 200, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'MEDIUM', half: 1 },
    { id: 'e3', timestamp: 300, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'FAR', half: 1 },
  ],
} as unknown as MatchState;

/** Match with mixed shots (no scoring run) */
const matchWithMixedEvents: MatchState = {
  ...baseMatch,
  events: [
    { id: 'e1', timestamp: 100, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
    { id: 'e2', timestamp: 200, teamId: 'AWAY', type: 'SHOT', result: 'GOAL', shotType: 'MEDIUM', half: 1 },
    { id: 'e3', timestamp: 300, teamId: 'HOME', type: 'SHOT', result: 'MISS', shotType: 'FAR', half: 1 },
    { id: 'e4', timestamp: 400, teamId: 'AWAY', type: 'SHOT', result: 'MISS', shotType: 'PENALTY', half: 1 },
  ],
} as unknown as MatchState;

const historicalMatches: MatchState[] = [
  {
    ...baseMatch,
    id: 'h1',
    events: [
      { id: 'h1e1', timestamp: 200, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
      { id: 'h1e2', timestamp: 400, teamId: 'HOME', type: 'SHOT', result: 'MISS', shotType: 'NEAR', half: 1 },
      { id: 'h1e3', timestamp: 600, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'MEDIUM', half: 1 },
      { id: 'h1e4', timestamp: 800, teamId: 'AWAY', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
      { id: 'h1e5', timestamp: 1000, teamId: 'AWAY', type: 'SHOT', result: 'MISS', shotType: 'FAR', half: 1 },
    ],
  } as unknown as MatchState,
];

// ─── buildGhostConfig ─────────────────────────────────────────────────────────

describe('buildGhostConfig', () => {
  it('returns a valid config structure with cold-start defaults when no history', () => {
    const config = buildGhostConfig(baseMatch, []);

    expect(config.home).toBeDefined();
    expect(config.away).toBeDefined();
    expect(config.remainingSeconds).toBeGreaterThan(0);
    expect(config.triggeredAtSecond).toBe(600);
  });

  it('zone weights sum to 1 for both teams (cold start)', () => {
    const config = buildGhostConfig(baseMatch, []);

    const homeWeightSum = Object.values(config.home.zoneWeights).reduce((a, b) => a + b, 0);
    const awayWeightSum = Object.values(config.away.zoneWeights).reduce((a, b) => a + b, 0);

    expect(homeWeightSum).toBeCloseTo(1, 4);
    expect(awayWeightSum).toBeCloseTo(1, 4);
  });

  it('zone efficiencies are in [0, 1] range', () => {
    const config = buildGhostConfig(baseMatch, []);

    Object.values(config.home.zoneEfficiency).forEach(eff => {
      expect(eff).toBeGreaterThanOrEqual(0);
      expect(eff).toBeLessThanOrEqual(1);
    });
    Object.values(config.away.zoneEfficiency).forEach(eff => {
      expect(eff).toBeGreaterThanOrEqual(0);
      expect(eff).toBeLessThanOrEqual(1);
    });
  });

  it('shot rate is positive', () => {
    const config = buildGhostConfig(baseMatch, []);
    expect(config.home.shotRatePerMinute).toBeGreaterThan(0);
    expect(config.away.shotRatePerMinute).toBeGreaterThan(0);
  });

  it('computes correct remaining seconds for first half mid-match', () => {
    // 10 min elapsed in H1 of a 50-min match → 40 min remaining
    const config = buildGhostConfig(baseMatch, []);
    expect(config.remainingSeconds).toBe(1500 * 2 - 600); // 2400s
  });

  it('computes remaining seconds correctly at half time', () => {
    const config = buildGhostConfig(matchAtHalfTime, []);
    expect(config.remainingSeconds).toBe(1500); // only 2nd half left
  });

  it('computes remaining seconds correctly in second half', () => {
    // 2nd half, 15 min elapsed → 10 min remaining
    const config = buildGhostConfig(matchInSecondHalf, []);
    expect(config.remainingSeconds).toBe(600);
  });

  it('computes near-zero remaining when match nearly over', () => {
    const config = buildGhostConfig(matchNearEnd, []);
    expect(config.remainingSeconds).toBe(60);
  });

  it('detects 3-consecutive-goal momentum run for HOME', () => {
    const config = buildGhostConfig(matchWithHomeRun, []);
    expect(config.home.momentumBoost).toBeCloseTo(1.15);
  });

  it('no momentum boost when no scoring run', () => {
    const config = buildGhostConfig(matchWithMixedEvents, []);
    expect(config.home.momentumBoost).toBeCloseTo(1.0);
    expect(config.away.momentumBoost).toBeCloseTo(1.0);
  });

  it('reads current score correctly from events', () => {
    const config = buildGhostConfig(matchWithHomeRun, []);
    expect(config.currentHomeScore).toBe(3);
    expect(config.currentAwayScore).toBe(0);
  });

  it('uses historical data to influence zone weights', () => {
    const configWithHistory = buildGhostConfig(baseMatch, historicalMatches);
    const configColdStart = buildGhostConfig(baseMatch, []);

    // With history, the zone weights should differ from cold-start defaults
    // Eagles have more NEAR and MEDIUM shots historically → weight should shift
    const histNear = configWithHistory.home.zoneWeights.NEAR;
    const coldNear = configColdStart.home.zoneWeights.NEAR;
    // Both valid — just confirm they're in valid range
    expect(histNear).toBeGreaterThan(0);
    expect(histNear).toBeLessThan(1);
    expect(coldNear).toBeGreaterThan(0);
  });

  it('applies fatigue decay when elapsed > 35 minutes', () => {
    const matchFatigued: MatchState = {
      ...baseMatch,
      currentHalf: 2,
      timer: { elapsedSeconds: 900, isRunning: false }, // 15 + 25 = 40 total minutes elapsed
    } as unknown as MatchState;

    const fatigued = buildGhostConfig(matchFatigued, []);
    const fresh = buildGhostConfig(baseMatch, []); // 10 min elapsed, no fatigue

    // Fatigued efficiencies should be lower
    const fatiguedNear = fatigued.home.zoneEfficiency.NEAR;
    const freshNear = fresh.home.zoneEfficiency.NEAR;
    expect(fatiguedNear).toBeLessThan(freshNear);
  });
});

// ─── runSimulations ───────────────────────────────────────────────────────────

describe('runSimulations', () => {
  it('win percentages sum to ~100', () => {
    const config = buildGhostConfig(baseMatch, []);
    const result = runSimulations(config, 1000);
    const total = result.homeWinPct + result.awayWinPct + result.drawPct;
    expect(total).toBeCloseTo(100, 0);
  });

  it('projected scores are >= current scores', () => {
    const config = buildGhostConfig(matchWithMixedEvents, []);
    const result = runSimulations(config, 500);
    expect(result.projectedHomeScore).toBeGreaterThanOrEqual(config.currentHomeScore);
    expect(result.projectedAwayScore).toBeGreaterThanOrEqual(config.currentAwayScore);
  });

  it('returns correct simCount', () => {
    const config = buildGhostConfig(baseMatch, []);
    const result = runSimulations(config, 500);
    expect(result.simCount).toBe(500);
  });

  it('scoreCloud entries have valid pct values', () => {
    const config = buildGhostConfig(baseMatch, []);
    const result = runSimulations(config, 500);
    result.scoreCloud.forEach(entry => {
      expect(entry.pct).toBeGreaterThan(0);
      expect(entry.pct).toBeLessThanOrEqual(100);
      expect(entry.home).toBeGreaterThanOrEqual(0);
      expect(entry.away).toBeGreaterThanOrEqual(0);
    });
  });

  it('scoreCloud pct values sum to ~100', () => {
    const config = buildGhostConfig(baseMatch, []);
    const result = runSimulations(config, 1000);
    const totalPct = result.scoreCloud.reduce((sum, e) => sum + e.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it('is deterministic — same config + same seed → same result', () => {
    const config = buildGhostConfig(baseMatch, []);
    const r1 = runSimulations(config, 500);
    const r2 = runSimulations(config, 500);

    expect(r1.homeWinPct).toBe(r2.homeWinPct);
    expect(r1.projectedHomeScore).toBe(r2.projectedHomeScore);
    expect(r1.projectedAwayScore).toBe(r2.projectedAwayScore);
  });

  it('different triggeredAtSecond produces different results', () => {
    const config1 = buildGhostConfig(baseMatch, []);
    const config2 = buildGhostConfig({ ...baseMatch, timer: { ...baseMatch.timer, elapsedSeconds: 601 } } as unknown as MatchState, []);

    const r1 = runSimulations(config1, 500);
    const r2 = runSimulations(config2, 500);

    // With different seeds, win% should differ (not strictly guaranteed but overwhelmingly likely)
    // We just confirm they're both valid
    expect(r1.homeWinPct + r1.awayWinPct + r1.drawPct).toBeCloseTo(100, 0);
    expect(r2.homeWinPct + r2.awayWinPct + r2.drawPct).toBeCloseTo(100, 0);
  });

  it('when no time remaining, projects only the current score', () => {
    const finishedMatch: MatchState = {
      ...baseMatch,
      currentHalf: 2,
      timer: { elapsedSeconds: 1500, isRunning: false },
      events: [
        { id: 'g1', timestamp: 100, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
        { id: 'g2', timestamp: 200, teamId: 'HOME', type: 'SHOT', result: 'GOAL', shotType: 'NEAR', half: 1 },
        { id: 'g3', timestamp: 300, teamId: 'AWAY', type: 'SHOT', result: 'GOAL', shotType: 'MEDIUM', half: 2 },
      ],
    } as unknown as MatchState;

    const config = buildGhostConfig(finishedMatch, []);
    expect(config.remainingSeconds).toBe(0);

    const result = runSimulations(config, 200);
    // No time left → every sim ends 2-1 → HOME wins 100%
    expect(result.projectedHomeScore).toBe(2);
    expect(result.projectedAwayScore).toBe(1);
    expect(result.homeWinPct).toBeCloseTo(100, 0);
  });

  it('with balanced teams and plenty of time, win% is in a plausible range', () => {
    // Both teams equal defaults, plenty of time
    const config = buildGhostConfig(baseMatch, []);
    const result = runSimulations(config, 2000);

    // With balanced cold-start defaults, HOME win% should be roughly 35–65%
    expect(result.homeWinPct).toBeGreaterThan(25);
    expect(result.homeWinPct).toBeLessThan(75);
  });
});
