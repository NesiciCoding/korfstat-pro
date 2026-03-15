import { MatchState, MatchEvent, Player, Role, TeamId } from '../types';

/**
 * Determines a player's current role based on their initial position and the total goals scored.
 * Zone switch occurs every 2 cumulative goals.
 */
export const getPlayerRole = (player: Player, totalGoals: number): Role => {
  const switches = Math.floor(totalGoals / 2);
  const isCurrentlySwitching = switches % 2 !== 0;

  if (isCurrentlySwitching) {
    return player.initialPosition === 'ATTACK' ? 'DEFENSE' : 'ATTACK';
  }
  return player.initialPosition === 'ATTACK' ? 'ATTACK' : 'DEFENSE';
};

/**
 * Gets the total number of goals in a match state.
 */
export const getTotalGoals = (matchState: MatchState): number => {
  return matchState.events.filter(e => e.result === 'GOAL').length;
};

/**
 * Gets the current 4-pack lineup for a team's specific role (ATTACK/DEFENSE).
 */
export const getPackByRole = (teamPlayers: Player[], role: Role, totalGoals: number): Player[] => {
  return teamPlayers.filter(p => p.onField && getPlayerRole(p, totalGoals) === role);
};

export interface LineupStats {
  id: string; // Comma-separated sorted IDs
  playerNames: string[];
  teamId: TeamId;
  goalsFor: number;
  goalsAgainst: number;
  plusMinus: number;
  timePlayedSeconds: number;
}

/**
 * Calculates lineup +/- and efficiency by replaying the match events.
 */
export const calculateLineupStats = (matchState: MatchState): LineupStats[] => {
  const statsMap: Map<string, LineupStats> = new Map();
  const { homeTeam, awayTeam, events } = matchState;

  // Helper to get/create stats object
  const getOrCreateStats = (playerIds: string[], teamId: TeamId): LineupStats => {
    const id = [...playerIds].sort().join(',');
    if (!statsMap.has(id)) {
      const players = teamId === 'HOME' ? homeTeam.players : awayTeam.players;
      const names = playerIds.map(pid => players.find(p => p.id === pid)?.name || 'Unknown');
      statsMap.set(id, {
        id,
        playerNames: names,
        teamId,
        goalsFor: 0,
        goalsAgainst: 0,
        plusMinus: 0,
        timePlayedSeconds: 0
      });
    }
    return statsMap.get(id)!;
  };

  // Replay match to track lineups and duration
  let lastTimestamp = 0;
  let currentHomeLineup: string[] = homeTeam.players.filter(p => p.onField).map(p => p.id);
  let currentAwayLineup: string[] = awayTeam.players.filter(p => p.onField).map(p => p.id);

  // Initial Pack Tracking (Home Attack, Home Defense, Away Attack, Away Defense)
  // But standard +/- is usually for the whole 4-pack on-court at once? 
  // In Korfball, standard +/- is per 4-pack (Attack/Defense).
  
  const processPackStats = (timestamp: number) => {
    const duration = timestamp - lastTimestamp;
    if (duration <= 0) return;

    // We need to know who was in WHICH pack during this time.
    // Total goals at start of this interval:
    const interimGoals = events.filter(e => e.timestamp < timestamp && e.result === 'GOAL').length;

    const homeAttack = homeTeam.players.filter(p => currentHomeLineup.includes(p.id) && getPlayerRole(p, interimGoals) === 'ATTACK').map(p => p.id);
    const homeDefense = homeTeam.players.filter(p => currentHomeLineup.includes(p.id) && getPlayerRole(p, interimGoals) === 'DEFENSE').map(p => p.id);
    const awayAttack = awayTeam.players.filter(p => currentAwayLineup.includes(p.id) && getPlayerRole(p, interimGoals) === 'ATTACK').map(p => p.id);
    const awayDefense = awayTeam.players.filter(p => currentAwayLineup.includes(p.id) && getPlayerRole(p, interimGoals) === 'DEFENSE').map(p => p.id);

    if (homeAttack.length === 4) getOrCreateStats(homeAttack, 'HOME').timePlayedSeconds += duration;
    if (homeDefense.length === 4) getOrCreateStats(homeDefense, 'HOME').timePlayedSeconds += duration;
    if (awayAttack.length === 4) getOrCreateStats(awayAttack, 'AWAY').timePlayedSeconds += duration;
    if (awayDefense.length === 4) getOrCreateStats(awayDefense, 'AWAY').timePlayedSeconds += duration;
  };

  // Process events chronologically
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  sortedEvents.forEach(event => {
    processPackStats(event.timestamp);
    lastTimestamp = event.timestamp;

    if (event.result === 'GOAL') {
      const interimGoals = events.filter(e => e.timestamp < event.timestamp && e.result === 'GOAL').length;
      
      // The scoring pack gets +1
      const scoringTeamId = event.teamId;
      const concedingTeamId = event.teamId === 'HOME' ? 'AWAY' : 'HOME';
      
      const scoringPlayers = scoringTeamId === 'HOME' ? currentHomeLineup : currentAwayLineup;
      const concedingPlayers = concedingTeamId === 'HOME' ? currentHomeLineup : currentAwayLineup;
      
      const scoringTeam = scoringTeamId === 'HOME' ? homeTeam : awayTeam;
      const concedingTeam = concedingTeamId === 'HOME' ? homeTeam : awayTeam;

      const scoringPack = scoringTeam.players.filter(p => scoringPlayers.includes(p.id) && getPlayerRole(p, interimGoals) === 'ATTACK').map(p => p.id);
      const concedingPack = concedingTeam.players.filter(p => concedingPlayers.includes(p.id) && getPlayerRole(p, interimGoals) === 'DEFENSE').map(p => p.id);

      if (scoringPack.length === 4) {
        const s = getOrCreateStats(scoringPack, scoringTeamId);
        s.goalsFor++;
        s.plusMinus++;
      }
      if (concedingPack.length === 4) {
        const s = getOrCreateStats(concedingPack, concedingTeamId);
        s.goalsAgainst++;
        s.plusMinus--;
      }
    }

    if (event.type === 'SUBSTITUTION' && event.subInId && event.subOutId) {
      if (event.teamId === 'HOME') {
        currentHomeLineup = currentHomeLineup.filter(id => id !== event.subOutId).concat(event.subInId);
      } else {
        currentAwayLineup = currentAwayLineup.filter(id => id !== event.subOutId).concat(event.subInId);
      }
    }
  });

  // Final stretch to match end or current time
  const lastEventTime = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].timestamp : 0;
  const currentMatchTime = matchState.timer.elapsedSeconds;
  processPackStats(currentMatchTime);

  return Array.from(statsMap.values()).sort((a, b) => b.plusMinus - a.plusMinus);
};

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
