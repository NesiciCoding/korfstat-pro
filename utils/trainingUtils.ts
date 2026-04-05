import { TrainingSession } from '../types/training';
import { Player, MatchState } from '../types';

export interface PlayerTrainingStats {
  playerId: string;
  name: string;
  attendance: number;
  drillCount: number;
  averageValue: number;
}

/**
 * Aggregates training session data into performance stats per player.
 */
export const aggregateTrainingStats = (
  sessions: TrainingSession[],
  allPlayers: Player[] = []
): PlayerTrainingStats[] => {
  const playerTrainingMap = new Map<string, PlayerTrainingStats>();

  sessions.forEach(session => {
    // Basic attendance tracking
    session.attendees.forEach(pId => {
      if (!playerTrainingMap.has(pId)) {
        const player = allPlayers.find(p => p.id === pId);
        playerTrainingMap.set(pId, {
          playerId: pId,
          name: player?.name || 'Unknown',
          attendance: 0,
          drillCount: 0,
          averageValue: 0
        });
      }
      const stat = playerTrainingMap.get(pId)!;
      stat.attendance++;
    });

    // Drill results performance tracking
    session.drillResults.forEach(res => {
      const stat = playerTrainingMap.get(res.playerId);
      if (stat) {
        stat.drillCount++;
        // Running average calculation
        stat.averageValue = (stat.averageValue * (stat.drillCount - 1) + res.value) / stat.drillCount;
      }
    });
  });

  return Array.from(playerTrainingMap.values()).sort((a, b) => b.attendance - a.attendance);
};

/**
 * Calculates a player's match performance percentage (Shot %) from a list of matches.
 */
export const calculatePlayerMatchStats = (
  playerId: string,
  matches: MatchState[]
): { goals: number, shots: number, percentage: number } => {
  let goals = 0;
  let shots = 0;

  matches.forEach(match => {
    match.events.forEach(event => {
      if (event.playerId === playerId) {
        if (event.type === 'SHOT') {
          shots++;
          if (event.result === 'GOAL') {
            goals++;
          }
        }
      }
    });
  });

  return {
    goals,
    shots,
    percentage: shots > 0 ? (goals / shots) * 100 : 0
  };
};

/**
 * Calculates the "Carry Over" metric: correlation between training drill performance
 * and match success. Returns a comparison object.
 */
export const correlatePerformance = (
  playerId: string,
  trainingStats: PlayerTrainingStats[],
  matches: MatchState[]
) => {
  const tStat = trainingStats.find(s => s.playerId === playerId);
  const mStat = calculatePlayerMatchStats(playerId, matches);

  if (!tStat || mStat.shots === 0) return null;

  // Correlation Delta: (Match% - Training%)
  // A positive delta means the player performs BETTER in matches than drills.
  // A negative delta might indicate a "Practice Hero" or higher drill difficulty.
  const delta = mStat.percentage - tStat.averageValue;

  return {
    playerId,
    name: tStat.name,
    trainingAvg: tStat.averageValue,
    matchAvg: mStat.percentage,
    delta,
    drillCount: tStat.drillCount,
    matchShots: mStat.shots
  };
};
