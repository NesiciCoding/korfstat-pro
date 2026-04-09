import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter,
  Cell, ZAxis,
} from 'recharts';
import { Ghost, RefreshCw, TrendingUp } from 'lucide-react';
import type { MatchState } from '../types';
import { useGhostSim } from '../hooks/useGhostSim';

interface GhostSimPanelProps {
  matchState: MatchState;
  historicalMatches: MatchState[];
}

/** Resolve a team color that is usable as a CSS color value.
 *  team.color is sometimes a Tailwind class string (bg-blue-500) and sometimes
 *  a raw hex/CSS color (#3b82f6). We detect the hex case and fall back to a
 *  safe default otherwise. */
function resolveColor(teamColor: string, fallback: string): string {
  if (!teamColor) return fallback;
  if (teamColor.startsWith('#') || teamColor.startsWith('rgb')) return teamColor;
  return fallback;
}

const HOME_DEFAULT_COLOR = '#4f46e5'; // indigo-600
const AWAY_DEFAULT_COLOR = '#e11d48'; // rose-600

// ── Win Probability Area Chart ────────────────────────────────────────────────

interface WinProbChartProps {
  history: { minute: number; homeWinPct: number; awayWinPct: number }[];
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  totalMinutes: number;
}

const WinProbChart: React.FC<WinProbChartProps> = ({
  history, homeName, awayName, homeColor, awayColor, totalMinutes,
}) => {
  // Build a padded series so the chart always shows the full match width
  const data = useMemo(() => {
    if (history.length === 0) return [];
    return history.map(pt => ({
      minute: pt.minute,
      home: Math.round(pt.homeWinPct),
      away: Math.round(pt.awayWinPct),
    }));
  }, [history]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
        Waiting for first simulation…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={homeColor} stopOpacity={0.6} />
            <stop offset="95%" stopColor={homeColor} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="awayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={awayColor} stopOpacity={0.6} />
            <stop offset="95%" stopColor={awayColor} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
        <XAxis
          dataKey="minute"
          type="number"
          domain={[0, totalMinutes]}
          tickCount={7}
          label={{ value: 'Minute', position: 'insideBottom', offset: -2, fontSize: 11 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11 }}
          width={38}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}%`, name === 'home' ? homeName : awayName]}
          labelFormatter={min => `Minute ${min}`}
        />
        <ReferenceLine y={50} stroke="rgba(150,150,150,0.4)" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="home"
          name="home"
          stroke={homeColor}
          fill="url(#homeGrad)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="away"
          name="away"
          stroke={awayColor}
          fill="url(#awayGrad)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ── Simulation Cloud Scatter Chart ────────────────────────────────────────────

interface SimCloudProps {
  scoreCloud: { home: number; away: number; count: number; pct: number }[];
  currentHomeScore: number;
  currentAwayScore: number;
  homeColor: string;
  awayColor: string;
}

const SimCloud: React.FC<SimCloudProps> = ({
  scoreCloud, currentHomeScore, currentAwayScore, homeColor, awayColor,
}) => {
  // Cap at top 80 outcomes to keep the chart readable
  const data = scoreCloud.slice(0, 80).map(pt => ({
    x: pt.away,
    y: pt.home,
    z: pt.count,
    pct: pt.pct,
    label: `${pt.home} – ${pt.away} (${pt.pct.toFixed(1)}%)`,
  }));

  const maxCount = data[0]?.z ?? 1;

  const getCellColor = (homeScore: number, awayScore: number) => {
    if (homeScore > awayScore) return homeColor;
    if (awayScore > homeScore) return awayColor;
    return '#9ca3af'; // draw = gray
  };

  const maxScore = Math.max(
    ...scoreCloud.map(p => Math.max(p.home, p.away)),
    currentHomeScore + 3,
    currentAwayScore + 3,
    5,
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
        <XAxis
          dataKey="x"
          type="number"
          name="Away score"
          domain={[0, maxScore]}
          tickCount={maxScore + 1}
          label={{ value: 'Away score', position: 'insideBottom', offset: -10, fontSize: 11 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          dataKey="y"
          type="number"
          name="Home score"
          domain={[0, maxScore]}
          tickCount={maxScore + 1}
          label={{ value: 'Home score', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
          tick={{ fontSize: 11 }}
          width={40}
        />
        {/* ZAxis maps count to bubble size (px radius) */}
        <ZAxis dataKey="z" range={[40, 800]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload as { y: number; x: number; pct: number };
            return (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs shadow">
                <span className="font-semibold">{d.y} – {d.x}</span>
                <span className="ml-2 text-gray-500">{d.pct.toFixed(1)}% of sims</span>
              </div>
            );
          }}
        />
        {/* Draw diagonal reference line */}
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: maxScore, y: maxScore }]}
          stroke="rgba(150,150,150,0.3)"
          strokeDasharray="5 5"
          label={{ value: 'Draw', fontSize: 10, fill: '#9ca3af', position: 'insideTopRight' }}
        />
        <Scatter data={data}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={getCellColor(entry.y, entry.x)}
              fillOpacity={0.2 + 0.7 * (entry.z / maxCount)}
              stroke={getCellColor(entry.y, entry.x)}
              strokeOpacity={0.5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

const GhostSimPanel: React.FC<GhostSimPanelProps> = ({ matchState, historicalMatches }) => {
  const { result, history, isRunning, lastUpdatedSecond } = useGhostSim(
    matchState,
    historicalMatches,
  );

  const homeColor = resolveColor(matchState.homeTeam.color, HOME_DEFAULT_COLOR);
  const awayColor = resolveColor(matchState.awayTeam.color, AWAY_DEFAULT_COLOR);
  const totalMinutes = Math.ceil((matchState.halfDurationSeconds * 2) / 60);

  const events = matchState.events;
  const currentHomeScore = events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
  const currentAwayScore = events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

  const lastUpdatedMin = lastUpdatedSecond !== null
    ? `${Math.floor(lastUpdatedSecond / 60)}:${String(lastUpdatedSecond % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="space-y-6 py-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ghost size={18} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Ghost Simulation
          </h2>
          {isRunning && (
            <RefreshCw size={13} className="text-indigo-400 animate-spin" />
          )}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {result
            ? `${result.simCount.toLocaleString()} simulations${lastUpdatedMin ? ` · ${lastUpdatedMin}` : ''}`
            : 'Initialising…'}
        </div>
      </div>

      {/* Ghost Line — predicted final score */}
      {result && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 dark:text-indigo-500 mb-2">
            Predicted Final Score
          </p>
          <div className="flex items-center justify-center gap-4 text-2xl font-bold text-gray-900 dark:text-white">
            <span style={{ color: homeColor }}>{matchState.homeTeam.name}</span>
            <span className="text-3xl tabular-nums">{result.projectedHomeScore}</span>
            <span className="text-gray-400">–</span>
            <span className="text-3xl tabular-nums">{result.projectedAwayScore}</span>
            <span style={{ color: awayColor }}>{matchState.awayTeam.name}</span>
          </div>
          <div className="flex justify-center gap-6 mt-3 text-sm">
            <span>
              <span className="font-semibold" style={{ color: homeColor }}>
                {matchState.homeTeam.name}
              </span>
              {' '}wins{' '}
              <span className="font-bold">{result.homeWinPct.toFixed(1)}%</span>
            </span>
            <span className="text-gray-400">·</span>
            <span>
              Draw{' '}
              <span className="font-bold text-gray-500">{result.drawPct.toFixed(1)}%</span>
            </span>
            <span className="text-gray-400">·</span>
            <span>
              <span className="font-semibold" style={{ color: awayColor }}>
                {matchState.awayTeam.name}
              </span>
              {' '}wins{' '}
              <span className="font-bold">{result.awayWinPct.toFixed(1)}%</span>
            </span>
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            Current score: {currentHomeScore} – {currentAwayScore}
          </p>
        </div>
      )}

      {/* Win Probability Graph */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Win Probability
          </h3>
          <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 rounded" style={{ background: homeColor }} />
              {matchState.homeTeam.name}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 rounded" style={{ background: awayColor }} />
              {matchState.awayTeam.name}
            </span>
          </div>
        </div>
        <WinProbChart
          history={history}
          homeName={matchState.homeTeam.name}
          awayName={matchState.awayTeam.name}
          homeColor={homeColor}
          awayColor={awayColor}
          totalMinutes={totalMinutes}
        />
      </div>

      {/* Simulation Cloud */}
      {result && result.scoreCloud.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Ghost size={14} className="text-gray-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Simulation Cloud
            </h3>
            <span className="ml-auto text-xs text-gray-400">
              Bubble size = frequency of that outcome
            </span>
          </div>
          <SimCloud
            scoreCloud={result.scoreCloud}
            currentHomeScore={currentHomeScore}
            currentAwayScore={currentAwayScore}
            homeColor={homeColor}
            awayColor={awayColor}
          />
          <div className="flex justify-center gap-6 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full opacity-70" style={{ background: homeColor }} />
              {matchState.homeTeam.name} win
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 opacity-70" />
              Draw
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full opacity-70" style={{ background: awayColor }} />
              {matchState.awayTeam.name} win
            </span>
          </div>
        </div>
      )}

      {!result && !isRunning && (
        <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
          No simulation data yet. Start the match clock to trigger the first run.
        </div>
      )}
    </div>
  );
};

export default GhostSimPanel;
