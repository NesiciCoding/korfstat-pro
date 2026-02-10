import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatchState, TeamId } from '../types';

export const generateJSON = (matchState: MatchState) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matchState, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `korfstat_match_${new Date(matchState.date || Date.now()).toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

const COLORS = {
    primary: [63, 81, 181] as [number, number, number], // Indigo
    secondary: [220, 38, 38] as [number, number, number], // Red
    success: [16, 185, 129] as [number, number, number], // Green
    text: [40, 40, 40] as [number, number, number],
    lightText: [100, 100, 100] as [number, number, number],
    grid: [230, 230, 230] as [number, number, number]
};

// --- Helper: Draw Korfball Court (Horizontal) ---
const drawCourt = (doc: jsPDF, x: number, y: number, width: number, height: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);

    // Outer Boundary
    doc.rect(x, y, width, height);

    // Half Line (Vertical)
    doc.line(x + width / 2, y, x + width / 2, y + height);

    // Korf Positions (1/6th from ends - approx 6.67m on 40m scale)
    // Actually standard is 6.67m from back line?
    // 40m length. Post is 6.67m from line?
    // Scale: 1/6 is 16.6%. 6.67/40 = 16.6%. Correct.
    const leftKorfX = x + (width * 0.166);
    const rightKorfX = x + width - (width * 0.166);
    const midY = y + height / 2;

    // Left Korf Zone
    doc.circle(leftKorfX, midY, 1); // Post
    // Penalty Spot (2.5m in front of post)
    // 2.5m on 40m court = 6.25% width
    doc.circle(leftKorfX + (width * 0.0625), midY, 0.5, 'F');

    // Right Korf Zone
    doc.circle(rightKorfX, midY, 1); // Post
    // Penalty Spot (2.5m in front of post - inwards)
    doc.circle(rightKorfX - (width * 0.0625), midY, 0.5, 'F');

    return { leftKorfX, rightKorfX, midY, scaleX: width / 100, scaleY: height / 100 };
};

// --- Helper: Draw Score Graph ---
const drawScoreGraph = (doc: jsPDF, matchState: MatchState, x: number, y: number, w: number, h: number) => {
    // Background and Axies
    doc.setFillColor(250, 250, 250);
    doc.rect(x, y, w, h, 'F');
    doc.setDrawColor(200);
    doc.line(x, y + h, x + w, y + h); // X axis
    doc.line(x, y, x, y + h); // Y axis

    const events = matchState.events
        .filter(e => e.type === 'SHOT' && e.result === 'GOAL')
        .sort((a, b) => a.timestamp - b.timestamp);

    let homeScore = 0;
    let awayScore = 0;
    let maxTime = matchState.halfDurationSeconds * 2; // Assuming 2 halves
    if (events.length > 0) {
        maxTime = Math.max(maxTime, events[events.length - 1].timestamp + 60);
    }

    // Find Max Score for Y-scaling
    const finalScore = Math.max(
        matchState.events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length,
        matchState.events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length
    );
    const maxY = Math.ceil((finalScore + 2) / 5) * 5; // Round up to nearest 5

    // Plot Points
    let prevX = x;
    let prevY_Home = y + h;
    let prevY_Away = y + h;

    events.forEach(e => {
        if (e.teamId === 'HOME') homeScore++;
        else awayScore++;

        const curX = x + (e.timestamp / maxTime) * w;
        const curY_Home = y + h - (homeScore / maxY) * h;
        const curY_Away = y + h - (awayScore / maxY) * h;

        // Draw Line Segments (Step Chart style)
        doc.setLineWidth(0.5);

        // Home Line
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.line(prevX, prevY_Home, curX, prevY_Home); // Horizontal step
        doc.line(curX, prevY_Home, curX, curY_Home);   // Vertical step

        // Away Line
        doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.line(prevX, prevY_Away, curX, prevY_Away);
        doc.line(curX, prevY_Away, curX, curY_Away);

        prevX = curX;
        prevY_Home = curY_Home;
        prevY_Away = curY_Away;
    });

    // Final extension to right edge
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.line(prevX, prevY_Home, x + w, prevY_Home);

    doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.line(prevX, prevY_Away, x + w, prevY_Away);

    // Labels
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("0", x - 2, y + h);
    doc.text(maxY.toString(), x - 2, y + 2);
    doc.text("Time", x + w / 2, y + h + 4, { align: 'center' });
};

// --- Calculate Advanced Stats Helper ---
const calculateAdvancedStats = (matchState: MatchState) => {
    // Plus/Minus Logic (Simplified from StatsView)
    const plusMinusMap = new Map<string, number>();
    const homeStarters = new Set(matchState.homeTeam.players.filter(p => p.isStarter).map(p => p.id));
    const awayStarters = new Set(matchState.awayTeam.players.filter(p => p.isStarter).map(p => p.id));

    // Initialize map
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

    return (teamId: TeamId) => {
        const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
        return team.players.map(player => {
            const events = matchState.events.filter(e => e.playerId === player.id);
            const shots = events.filter(e => e.type === 'SHOT');
            const goals = shots.filter(e => e.result === 'GOAL');
            const rebounds = events.filter(e => e.type === 'REBOUND');
            const fouls = events.filter(e => e.type === 'FOUL');
            const turnovers = events.filter(e => e.type === 'TURNOVER');

            // VAL Formula: (Goals * 5) + (Rebounds * 2) - (Misses * 1) - (Turnovers * 3) - (Fouls * 2)
            const misses = shots.length - goals.length;
            const rating = (goals.length * 5) + (rebounds.length * 2) - (misses * 1) - (turnovers.length * 3) - (fouls.length * 2);

            return [
                player.number.toString(),
                player.name,
                `${goals.length} / ${shots.length}`,
                shots.length > 0 ? `${Math.round((goals.length / shots.length) * 100)}%` : '0%',
                rebounds.length.toString(),
                turnovers.length.toString(),
                fouls.length.toString(),
                rating.toString(), // VAL column
                (plusMinusMap.get(player.id) || 0) > 0 ? `+${plusMinusMap.get(player.id)}` : (plusMinusMap.get(player.id) || 0).toString()
            ];
        }).sort((a, b) => parseInt(b[7]) - parseInt(a[7])); // Sort by VAL
    };
};

export const generatePDF = (matchState: MatchState) => {
    const doc = new jsPDF();
    const dateStr = new Date(matchState.date || Date.now()).toLocaleDateString();

    // --- PAGE 1: SUMMARY ---

    // Header
    doc.setFontSize(22);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text("KorfStat Pro - Match Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    doc.text(`Date: ${dateStr} | ID: ${matchState.id?.substring(0, 8) || 'N/A'}`, 14, 28);

    // Scoreboard
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 35, 182, 30, 3, 3, 'F');

    const homeScore = matchState.events.filter(e => e.teamId === 'HOME' && e.result === 'GOAL').length;
    const awayScore = matchState.events.filter(e => e.teamId === 'AWAY' && e.result === 'GOAL').length;

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(matchState.homeTeam.name, 20, 50);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(homeScore.toString(), 95, 52, { align: 'right' });

    doc.setTextColor(0);
    doc.text("-", 105, 52, { align: 'center' });

    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text(awayScore.toString(), 115, 52);
    doc.setTextColor(0);
    doc.text(matchState.awayTeam.name, 190, 50, { align: 'right' });

    // Score Graph
    doc.setFontSize(12);
    doc.text("Score Progression", 14, 80);
    drawScoreGraph(doc, matchState, 14, 85, 182, 60);

    // Team Stats Comparison (Textual for now)
    const homeRebounds = matchState.events.filter(e => e.teamId === 'HOME' && e.type === 'REBOUND').length;
    const awayRebounds = matchState.events.filter(e => e.teamId === 'AWAY' && e.type === 'REBOUND').length;
    const homeTurnovers = matchState.events.filter(e => e.teamId === 'HOME' && e.type === 'TURNOVER').length;
    const awayTurnovers = matchState.events.filter(e => e.teamId === 'AWAY' && e.type === 'TURNOVER').length;

    doc.setFontSize(12);
    doc.text("Team Metrics", 14, 160);

    // Simple Meter Charts
    const drawMeter = (label: string, v1: number, v2: number, y: number) => {
        const center = 105;
        const total = v1 + v2 || 1;
        const width = 100;
        const h = 6;

        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.text(label, center, y - 2, { align: 'center' });

        // Bars
        const w1 = (v1 / total) * width;
        const w2 = (v2 / total) * width;

        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(center - w1, y, w1, h, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255);
        doc.text(v1.toString(), center - w1 + 2, y + 4.5);

        doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.rect(center, y, w2, h, 'F');
        doc.text(v2.toString(), center + w2 - 2, y + 4.5, { align: 'right' });
    };

    drawMeter("Rebounds", homeRebounds, awayRebounds, 170);
    drawMeter("Turnovers", homeTurnovers, awayTurnovers, 185);


    // --- PAGE 2: HEAT MAPS ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text("Shot Analysis", 14, 20);

    // Legend
    doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
    doc.circle(150, 20, 1.5, 'F');
    doc.setFontSize(10);
    doc.text("Goal", 155, 21);

    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.circle(170, 20, 1.5, 'F');
    doc.text("Miss", 175, 21);

    // Draw Court 1 (Home Team Shots)
    doc.setFontSize(12);
    doc.text(`${matchState.homeTeam.name} Shots`, 14, 30);

    const cw = 120;
    const ch = 80;
    const cx = 45;

    // HOME Attacks on LEFT (if pos map is used) or we normalize?
    // Let's assume normalizing: Location 0-100.
    // X=0-50 is one half, 50-100 other half.
    // If stats are normalized 0-100 (where 0 is left, 100 is right).
    // "Home Team Shots": We plot all shots where teamId = HOME.
    // But on the court, they switch ends?
    // Ideally we plot them on a "Half Court" or "Full Court".
    // Let's plot on Full Court.

    // Draw Court (Home)
    drawCourt(doc, cx, 35, cw, ch);

    matchState.events.forEach(e => {
        if (e.teamId === 'HOME' && e.type === 'SHOT' && e.location) {
            const lx = cx + (e.location.x / 100) * cw;
            const ly = 35 + (e.location.y / 100) * ch;

            if (e.result === 'GOAL') doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
            else doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);

            doc.circle(lx, ly, 1.2, 'F');
        }
    });

    // Draw Court (Away)
    doc.text(`${matchState.awayTeam.name} Shots`, 14, 130);
    drawCourt(doc, cx, 135, cw, ch);

    matchState.events.forEach(e => {
        if (e.teamId === 'AWAY' && e.type === 'SHOT' && e.location) {
            const lx = cx + (e.location.x / 100) * cw;
            const ly = 135 + (e.location.y / 100) * ch;

            if (e.result === 'GOAL') doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
            else doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);

            doc.circle(lx, ly, 1.2, 'F');
        }
    });


    // --- PAGE 3: ADVANCED STATS ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text("Advanced Player Statistics", 14, 20);

    const getStats = calculateAdvancedStats(matchState);

    // Home Table
    doc.setFontSize(14);
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(14, 30, 5, 5, 'F');
    doc.text(matchState.homeTeam.name, 22, 34);

    autoTable(doc, {
        startY: 38,
        head: [['#', 'Player', 'Goals/S', '%', 'Reb', 'TO', 'Foul', 'VAL', '+/-']],
        body: getStats('HOME'),
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary },
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        columnStyles: {
            1: { halign: 'left' }
        }
    });

    // Away Table
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.rect(14, finalY - 4, 5, 5, 'F');
    doc.text(matchState.awayTeam.name, 22, finalY);

    autoTable(doc, {
        startY: finalY + 4,
        head: [['#', 'Player', 'Goals/S', '%', 'Reb', 'TO', 'Foul', 'VAL', '+/-']],
        body: getStats('AWAY'),
        theme: 'grid',
        headStyles: { fillColor: COLORS.secondary },
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        columnStyles: {
            1: { halign: 'left' }
        }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated by KorfStat Pro - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`korfstat_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
