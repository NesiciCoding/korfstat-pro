import { buildGhostConfig, runSimulations } from '../services/ghostSimService';
import type { MatchState } from '../types';

interface WorkerInput {
  matchState: MatchState;
  historicalMatches: MatchState[];
  n?: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { matchState, historicalMatches, n = 10000 } = e.data;
  const config = buildGhostConfig(matchState, historicalMatches);
  const result = runSimulations(config, n);
  self.postMessage(result);
};
