import * as XLSX from 'xlsx';
import { MatchState, TeamId } from '../types';

export const generateExcel = (matchState: MatchState) => {
    const wb = XLSX.utils.book_new();

    // --- Sheet 1: Match Summary ---
    const homeScore = matchState.events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
    const awayScore = matchState.events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

    const summaryData = [
        ['KorfStat Pro - Match Report'],
        ['Date', new Date(matchState.date || Date.now()).toLocaleDateString()],
        ['ID', matchState.id || 'N/A'],
        [],
        ['Team', 'Name', 'Score'],
        ['Home', matchState.homeTeam.name, homeScore],
        ['Away', matchState.awayTeam.name, awayScore],
        [],
        ['Team Metrics'],
        ['', 'Home', 'Away'],
        ['Rebounds',
            matchState.events.filter(e => e.teamId === 'HOME' && e.type === 'REBOUND').length,
            matchState.events.filter(e => e.teamId === 'AWAY' && e.type === 'REBOUND').length
        ],
        ['Turnovers',
            matchState.events.filter(e => e.teamId === 'HOME' && e.type === 'TURNOVER').length,
            matchState.events.filter(e => e.teamId === 'AWAY' && e.type === 'TURNOVER').length
        ],
        ['Fouls',
            matchState.events.filter(e => e.teamId === 'HOME' && e.type === 'FOUL').length,
            matchState.events.filter(e => e.teamId === 'AWAY' && e.type === 'FOUL').length
        ]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // --- Sheet 2: Player Stats ---
    // Helper to calculate advanced stats (VAL, +/-) - Reusing logic from PDF/StatsView roughly
    const plusMinusMap = new Map<string, number>();
    const homeStarters = new Set(matchState.homeTeam.players.filter(p => p.isStarter).map(p => p.id));
    const awayStarters = new Set(matchState.awayTeam.players.filter(p => p.isStarter).map(p => p.id));

    [...matchState.homeTeam.players, ...matchState.awayTeam.players].forEach(p => plusMinusMap.set(p.id, 0));

    matchState.events.sort((a, b) => a.timestamp - b.timestamp).forEach(e => {
        if (e.type === 'SUBSTITUTION' && e.subInId && e.subOutId) {
            if (e.teamId === 'HOME') { homeStarters.delete(e.subOutId); homeStarters.add(e.subInId); }
            else { awayStarters.delete(e.subOutId); awayStarters.add(e.subInId); }
        }
        if (e.type === 'SHOT' && e.result === 'GOAL') {
            if (e.teamId === 'HOME') {
                homeStarters.forEach(id => plusMinusMap.set(id, (plusMinusMap.get(id) || 0) + 1));
                awayStarters.forEach(id => plusMinusMap.set(id, (plusMinusMap.get(id) || 0) - 1));
            } else {
                awayStarters.forEach(id => plusMinusMap.set(id, (plusMinusMap.get(id) || 0) + 1));
                homeStarters.forEach(id => plusMinusMap.set(id, (plusMinusMap.get(id) || 0) - 1));
            }
        }
    });

    const getPlayerRow = (teamId: TeamId) => {
        const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        return team.players.map(p => {
            const events = matchState.events.filter(e => e.playerId === p.id);
            const shots = events.filter(e => e.type === 'SHOT');
            const goals = shots.filter(e => e.result === 'GOAL');
            const misses = shots.length - goals.length;
            const rebounds = events.filter(e => e.type === 'REBOUND');
            const fouls = events.filter(e => e.type === 'FOUL');
            const turnovers = events.filter(e => e.type === 'TURNOVER');

            const rating = (goals.length * 5) + (rebounds.length * 2) - (misses * 1) - (turnovers.length * 3) - (fouls.length * 2);

            return {
                Team: team.name,
                Number: p.number,
                Name: p.name,
                Goals: goals.length,
                Shots: shots.length,
                'Shot %': shots.length > 0 ? Math.round((goals.length / shots.length) * 100) + '%' : '0%',
                Rebounds: rebounds.length,
                Turnovers: turnovers.length,
                Fouls: fouls.length,
                VAL: rating,
                '+/-': plusMinusMap.get(p.id) || 0
            };
        }).sort((a, b) => b.VAL - a.VAL);
    };

    const playerStats = [
        ...getPlayerRow('HOME'),
        ...getPlayerRow('AWAY')
    ];

    const wsPlayers = XLSX.utils.json_to_sheet(playerStats);
    XLSX.utils.book_append_sheet(wb, wsPlayers, "Player Stats");


    // --- Sheet 3: Event Log ---
    const eventLog = matchState.events.sort((a, b) => a.timestamp - b.timestamp).map(e => {
        const team = e.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        const player = team.players.find(p => p.id === e.playerId);

        return {
            Time: Math.floor(e.timestamp / 60) + ':' + (e.timestamp % 60).toString().padStart(2, '0'),
            Half: e.half,
            Team: team.name,
            Player: player ? `#${player.number} ${player.name}` : '',
            Action: e.type,
            Detail: e.result || e.type === 'SUBSTITUTION' ? 'SUB' : '',
            ShotType: e.shotType || '',
            Result: e.result || ''
        };
    });

    const wsEvents = XLSX.utils.json_to_sheet(eventLog);
    XLSX.utils.book_append_sheet(wb, wsEvents, "Event Log");

    // --- Write File ---
    XLSX.writeFile(wb, `korfstat_export_${new Date(matchState.date || Date.now()).toISOString().split('T')[0]}.xlsx`);
};
