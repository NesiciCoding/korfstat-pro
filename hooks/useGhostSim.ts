import { useEffect, useRef, useState, useCallback } from 'react';
import type { MatchState } from '../types';
import type { SimulationResult } from '../services/ghostSimService';

export interface GhostSimHistoryPoint {
  /** Match clock minute at which the simulation ran */
  minute: number;
  homeWinPct: number;
  awayWinPct: number;
}

export interface GhostSimState {
  result: SimulationResult | null;
  history: GhostSimHistoryPoint[];
  isRunning: boolean;
  lastUpdatedSecond: number | null;
}

const INTERVAL_MS = 60_000; // trigger every 60 seconds during live play

export function useGhostSim(
  matchState: MatchState,
  historicalMatches: MatchState[],
): GhostSimState {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<GhostSimHistoryPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastUpdatedSecond, setLastUpdatedSecond] = useState<number | null>(null);

  // Keep stable refs so the interval callback doesn't capture stale closures
  const matchStateRef = useRef(matchState);
  const historicalMatchesRef = useRef(historicalMatches);
  matchStateRef.current = matchState;
  historicalMatchesRef.current = historicalMatches;

  const triggerSimulation = useCallback(() => {
    if (!workerRef.current) return;
    setIsRunning(true);
    workerRef.current.postMessage({
      matchState: matchStateRef.current,
      historicalMatches: historicalMatchesRef.current,
      n: 10000,
    });
  }, []);

  // Create / teardown the Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/ghostSimWorker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent<SimulationResult>) => {
      const simResult = e.data;
      setResult(simResult);
      setIsRunning(false);
      setLastUpdatedSecond(simResult.triggeredAtSecond);

      // Accumulate history for the win probability line chart
      const totalElapsed =
        (matchStateRef.current.currentHalf - 1) *
          matchStateRef.current.halfDurationSeconds +
        simResult.triggeredAtSecond;
      const minute = Math.floor(totalElapsed / 60);

      setHistory(prev => {
        // Replace or append: if this minute already exists, update it
        const idx = prev.findIndex(p => p.minute === minute);
        const point: GhostSimHistoryPoint = {
          minute,
          homeWinPct: simResult.homeWinPct,
          awayWinPct: simResult.awayWinPct,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = point;
          return next;
        }
        return [...prev, point].sort((a, b) => a.minute - b.minute);
      });
    };

    worker.onerror = (err) => {
      console.error('[GhostSim] Worker error:', err);
      setIsRunning(false);
    };

    workerRef.current = worker;

    // Run an initial simulation immediately
    triggerSimulation();

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — worker is created once per mount

  // Trigger on every new goal
  const goalCount = matchState.events.filter(
    e => e.type === 'SHOT' && e.result === 'GOAL',
  ).length;

  const prevGoalCount = useRef(goalCount);
  useEffect(() => {
    if (goalCount !== prevGoalCount.current) {
      prevGoalCount.current = goalCount;
      triggerSimulation();
    }
  }, [goalCount, triggerSimulation]);

  // Trigger on 60-second interval when match clock is running
  useEffect(() => {
    if (!matchState.timer.isRunning) return;
    const id = setInterval(triggerSimulation, INTERVAL_MS);
    return () => clearInterval(id);
  }, [matchState.timer.isRunning, triggerSimulation]);

  return { result, history, isRunning, lastUpdatedSecond };
}
