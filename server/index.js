import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import zlib from 'zlib';
import { saveMatchState, getMatchState, getLatestMatchState, saveMatchTemplate, getAllTemplates, deleteTemplate } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port hardcoded to 3002 to match the entire frontend ecosystem and bypass env overrides
const PORT = 3002;

// Helper to convert hex to decimal color (Companion v3+ uses decimal)
const hexToDec = (hex) => parseInt(String(hex).replace('#', ''), 16);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Setup Uploads Directory ---
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext)
    }
});
const upload = multer({ storage: storage });

const server = createServer(app);

// Configure CORS based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : ['*']; // Allow all in development

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    // Allow clients to connect directly via WebSocket (skip XHR polling)
    // This is needed for Android/Wear OS clients
    transports: ['polling', 'websocket'],
    allowUpgrades: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow Engine.IO v3 clients (Java socket.io-client 2.x sends EIO=3)
    allowEIO3: true
});

// Serve static frontend files from Vite dist folder

// ─────────────────────────────────────────────────────────────────────────────
// Bitfocus Companion / Button-Box REST API
// ─────────────────────────────────────────────────────────────────────────────

// Simple token auth — displayed in the Manager UI.
// Default: 'korfstat' so it works out of the box; users can override via env var.
const COMPANION_TOKEN = process.env.COMPANION_TOKEN || 'korfstat';
let companionPushUrl = process.env.COMPANION_URL || ''; 

// --- Path-Based Authentication Middleware ---
// Allows Base URL to be http://(ip):3002/korfstat
// This handles cases where Companion modules don't support headers
app.use((req, res, next) => {
    const parts = req.path.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === COMPANION_TOKEN && parts[1] === 'api') {
        const newPath = '/' + parts.slice(1).join('/');
        console.log(`[Companion] [Auth] Rewriting path from ${req.path} to ${newPath}`);
        req.url = newPath;
        req.tokenVerified = true;
    }
    next();
});

const companionAuth = (req, res, next) => {
    // 1. Check if already verified by path-based middleware
    if (req.tokenVerified) return next();

    // 2. Check Authorization: Bearer <token>
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    
    // 3. Check X-Companion-Token header (legacy/wiki consistency)
    if (!token && req.headers['x-companion-token']) {
        token = req.headers['x-companion-token'];
    }
    
    // 4. Check token query parameter (e.g. ?token=korfstat)
    // Handle cases where Companion appends the path directly to the token (?token=korfstat/api/...)
    if (!token && req.query.token) {
        token = req.query.token.split('/')[0];
    }

    if (token === COMPANION_TOKEN) {
        return next();
    }

    console.warn(`[Companion] [${new Date().toISOString()}] Unauthorized attempt: ${req.method} ${req.path} from ${req.ip || req.connection.remoteAddress}`);
    return res.status(401).json({ error: 'Unauthorized. Please provide a valid Companion token.' });
};

// --- Active Matches State ---
let activeMatchId = null;
const activeMatches = new Map(); // matchId -> MatchState

/**
 * GET /api/companion/setup-info
 */
app.get('/api/companion/setup-info', async (req, res) => {
    let localIp = '127.0.0.1';
    try {
        const { networkInterfaces } = await import('os');
        const nets = networkInterfaces();
        for (const iface of Object.values(nets)) {
            for (const addr of (iface || [])) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    localIp = addr.address;
                    break;
                }
            }
            if (localIp !== '127.0.0.1') break;
        }
    } catch { }
    res.json({
        serverUrl: `http://${localIp}:${PORT}`,
        serverPort: PORT,
        localIp,
        token: COMPANION_TOKEN,
        companionUrl: companionPushUrl,
        activeMatchId,
        activeMatch: activeMatchId ? activeMatches.get(activeMatchId) : null
    });
});

/**
 * GET /api/companion/state/score
 */
app.get('/api/companion/state/score', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.status(404).json({ error: 'No active match' });
    
    let home = 0;
    let away = 0;
    if (match.events) {
        home = match.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === 'HOME').length;
        away = match.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === 'AWAY').length;
    }
    
    res.json({ home, away, scoreDisplay: `${home}-${away}` });
});

/**
 * Granular Endpoints
 */
/**
 * GET /api/companion/state/score/home
 */
app.get('/api/companion/state/score/home', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.status(404).json({ value: 0 });
    const homeId = match.homeTeam?.id || 'HOME';
    const val = match.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === homeId).length;
    res.json({ value: val });
});

app.get('/api/companion/state/score/away', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.status(404).json({ value: 0 });
    const awayId = match.awayTeam?.id || 'AWAY';
    const val = match.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === awayId).length;
    res.json({ value: val });
});

/**
 * RAW Endpoints (Text/Plain)
 */
app.get('/api/companion/state/score/home/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    const homeId = match.homeTeam?.id || 'HOME';
    const val = match.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === homeId).length;
    res.json(val);
});

app.get('/api/companion/state/score/away/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    const awayId = match.awayTeam?.id || 'AWAY';
    const val = match.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === awayId).length;
    res.json(val);
});

app.get('/api/companion/state/time/match/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json("0:00");
    const now = Date.now();
    let elapsed = match.timer.elapsedSeconds || 0;
    if (match.timer.isRunning && match.timer.lastStartTime) {
        elapsed += (now - match.timer.lastStartTime) / 1000;
    }
    const duration = match.halfDurationSeconds || (match.profile?.halfDuration * 60) || 1500;
    const rem = Math.max(0, duration - elapsed);
    const m = Math.floor(rem / 60);
    const s = Math.floor(rem % 60);
    res.json(`${m}:${s.toString().padStart(2, '0')}`);
});

app.get('/api/companion/state/time/shotclock/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    let sc = match.shotClock?.seconds || 0;
    if (match.shotClock?.isRunning && match.shotClock?.lastStartTime) {
        sc -= (Date.now() - match.shotClock.lastStartTime) / 1000;
    }
    res.json(Math.ceil(Math.max(0, sc)));
});

app.get('/api/companion/state/fouls/home/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    const homeId = match.homeTeam?.id || 'HOME';
    const val = match.events.filter(e => e.type === 'FOUL' && e.teamId === homeId).length;
    res.json(val);
});

app.get('/api/companion/state/fouls/away/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    const awayId = match.awayTeam?.id || 'AWAY';
    const val = match.events.filter(e => e.type === 'FOUL' && e.teamId === awayId).length;
    res.json(val);
});

app.get('/api/companion/state/names/home/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    res.json(match?.homeTeam?.name || 'HOME');
});

app.get('/api/companion/state/names/away/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    res.json(match?.awayTeam?.name || 'AWAY');
});

app.get('/api/companion/state/timeouts/home/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    const val = match.events.filter(e => e.type === 'TIMEOUT' && e.teamId === 'HOME').length;
    res.json(val);
});

app.get('/api/companion/state/timeouts/away/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match) return res.json(0);
    const val = match.events.filter(e => e.type === 'TIMEOUT' && e.teamId === 'AWAY').length;
    res.json(val);
});

app.get('/api/companion/state/running/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    res.json(match?.timer?.isRunning ? 1 : 0);
});

app.get('/api/companion/state/shotclock-running/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    res.json(match?.shotClock?.isRunning ? 1 : 0);
});

app.get('/api/companion/state/last-event/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    if (!match || !match.events || match.events.length === 0) return res.json("-");
    
    // Find last significant event (not a timer event)
    const significantEvents = match.events.filter(e => ['SHOT', 'GOAL', 'FOUL', 'TIMEOUT', 'CARD', 'SUBSTITUTION'].includes(e.type));
    if (significantEvents.length === 0) return res.json("-");
    
    const last = significantEvents[significantEvents.length - 1];
    let desc = last.type;
    if (last.type === 'SHOT' || last.type === 'GOAL') {
        const team = last.teamId === 'HOME' ? (match.homeTeam?.name || 'HOME') : (match.awayTeam?.name || 'AWAY');
        desc = `${last.result === 'GOAL' ? 'GOAL' : 'Miss'} - ${team}`;
    } else {
        desc = `${last.type} - ${last.teamId}`;
    }
    res.json(desc);
});

app.get('/api/companion/state/period/raw', (req, res) => {
    const match = activeMatchId ? activeMatches.get(activeMatchId) : null;
    res.json(match?.currentHalf || 1);
});

app.get('/api/companion/test', companionAuth, (req, res) => {
    res.type('text/plain').send("API_OK");
});

// Other existing API routes...
app.use(express.static(path.join(__dirname, '..', 'dist')));

// --- API Endpoints ---

// Handle file uploads (Logos & Photos)
app.post('/api/upload', upload.single('asset'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    // Return relative URL for clients to load
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});



/**
 * GET /api/companion/status
 * Companion polls this endpoint to update button labels and LED colours.
 * Returns a flat object with all key match values for the LATEST match by default,
 * or a specific match if matchId is provided in headers.
 */
app.get('/api/companion/status', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    let s = null;
    
    if (matchId && activeMatches.has(matchId)) {
        s = activeMatches.get(matchId);
    } else {
        // Fallback to latest match in memory or DB
        s = Array.from(activeMatches.values())[0] || getLatestMatchState();
    }

    if (!s) return res.json({ active: false });

    // Derive score from events
    let homeScore = 0, awayScore = 0;
    if (s.events) {
        s.events.forEach(e => {
            if (e.type === 'GOAL' || e.result === 'GOAL') {
                if (e.teamId === 'HOME') homeScore++;
                else if (e.teamId === 'AWAY') awayScore++;
            }
        });
    }

    const pad = (n) => String(Math.floor(n)).padStart(2, '0');
    const clockSec = s.clock?.elapsed ?? 0;
    const clockDisplay = `${pad(clockSec / 60)}:${pad(clockSec % 60)}`;
    const shotSec = s.shotClock?.elapsed ?? 0;
    const shotClockDisplay = `${pad(shotSec / 60)}:${pad(shotSec % 60)}`;

    res.json({
        active: true,
        scoreHome: homeScore,
        scoreAway: awayScore,
        scoreDisplay: `${homeScore} - ${awayScore}`,
        homeTeamName: s.homeTeam?.name ?? 'Home',
        awayTeamName: s.awayTeam?.name ?? 'Away',
        clockDisplay,
        shotClockDisplay,
        period: s.currentPeriod ?? 1,
        isRunning: s.clock?.isRunning ?? false,
        isShotClockRunning: s.shotClock?.isRunning ?? false,
        totalPeriods: s.profile?.periods ?? 2,
    });
});

/**
 * GET /api/companion/buttons
 * Returns a suggested 15-button layout for Companion auto-config.
 */
app.get('/api/companion/buttons', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    let s = null;
    if (matchId && activeMatches.has(matchId)) {
        s = activeMatches.get(matchId);
    } else {
        s = Array.from(activeMatches.values())[0] || getLatestMatchState();
    }

    const home = s?.homeTeam?.name ?? 'HOME';
    const away = s?.awayTeam?.name ?? 'AWAY';
    const isRunning = s?.clock?.isRunning ?? false;

    res.json([
        { id: 'clock_toggle', label: isRunning ? '⏸ Pause Clock' : '▶ Start Clock', color: isRunning ? '#f59e0b' : '#22c55e', action: 'POST /api/companion/clock/toggle' },
        { id: 'clock_reset', label: '⟳ Reset Clock', color: '#6366f1', action: 'POST /api/companion/clock/reset' },
        { id: 'shot_reset', label: '⏱ Shot Clock', color: '#8b5cf6', action: 'POST /api/companion/shotclock/reset' },
        { id: 'goal_home', label: `⚽ Goal ${home}`, color: '#ef4444', action: 'POST /api/companion/goal/home' },
        { id: 'goal_away', label: `⚽ Goal ${away}`, color: '#3b82f6', action: 'POST /api/companion/goal/away' },
        { id: 'undo_home', label: `↩ Undo ${home}`, color: '#78716c', action: 'POST /api/companion/goal/home/undo' },
        { id: 'undo_away', label: `↩ Undo ${away}`, color: '#78716c', action: 'POST /api/companion/goal/away/undo' },
        { id: 'foul_home', label: `⚠ Foul ${home}`, color: '#f97316', action: 'POST /api/companion/foul/home' },
        { id: 'foul_away', label: `⚠ Foul ${away}`, color: '#f97316', action: 'POST /api/companion/foul/away' },
        { id: 'period_next', label: '⏭ Next Period', color: '#0ea5e9', action: 'POST /api/companion/period/next' },
        { id: 'gfx_lineup', label: '📋 Show Lineup', color: '#14b8a6', action: 'POST /api/companion/graphics/lineup' },
        { id: 'gfx_halftime', label: '🕐 Halftime', color: '#14b8a6', action: 'POST /api/companion/graphics/halftime' },
        { id: 'gfx_goal', label: '🎉 Goal Graphic', color: '#14b8a6', action: 'POST /api/companion/graphics/goal_celebration' },
        { id: 'gfx_dismiss', label: '✖ Dismiss GFX', color: '#6b7280', action: 'POST /api/companion/graphics/dismiss' },
        { id: 'status', label: 'Score Display', color: '#1e293b', action: 'GET /api/companion/status' },
    ]);
});

// ── Companion Action Endpoints ──────────────────────────────────────────────

app.post('/api/companion/clock/toggle', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Clock Toggle (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'CLOCK_TOGGLE', matchId });
    io.emit('companion-action', { type: 'CLOCK_TOGGLE', matchId }); // Global fallback
    res.json({ ok: true, action: 'CLOCK_TOGGLE' });
});

app.post('/api/companion/clock/reset', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Clock Reset (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'CLOCK_RESET', matchId });
    io.emit('companion-action', { type: 'CLOCK_RESET', matchId });
    res.json({ ok: true, action: 'CLOCK_RESET' });
});

app.post('/api/companion/shotclock/reset', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Shotclock Reset (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'SHOTCLOCK_RESET', matchId });
    io.emit('companion-action', { type: 'SHOTCLOCK_RESET', matchId });
    res.json({ ok: true, action: 'SHOTCLOCK_RESET' });
});

app.post('/api/companion/goal/:team', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Goal ${team} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'GOAL', teamId: team, matchId });
    io.emit('companion-action', { type: 'GOAL', teamId: team, matchId });
    res.json({ ok: true, action: 'GOAL', teamId: team });
});

app.post('/api/companion/goal/:team/undo', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Undo Goal ${team} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'GOAL_UNDO', teamId: team, matchId });
    io.emit('companion-action', { type: 'GOAL_UNDO', teamId: team, matchId });
    res.json({ ok: true, action: 'GOAL_UNDO', teamId: team });
});

app.post('/api/companion/foul/:team', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Foul ${team} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'FOUL', teamId: team, matchId });
    io.emit('companion-action', { type: 'FOUL', teamId: team, matchId });
    res.json({ ok: true, action: 'FOUL', teamId: team });
});

app.post('/api/companion/period/next', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Next Period (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'PERIOD_NEXT', matchId });
    io.emit('companion-action', { type: 'PERIOD_NEXT', matchId });
    res.json({ ok: true, action: 'PERIOD_NEXT' });
});

app.post('/api/companion/graphics/:type', companionAuth, (req, res) => {
    const graphicType = req.params.type;
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: GFX ${graphicType} (Match: ${matchId || 'global'})`);
    const VALID_GRAPHICS = ['lineup', 'halftime', 'goal_celebration', 'stats', 'dismiss'];
    if (!VALID_GRAPHICS.includes(graphicType)) {
        return res.status(400).json({ error: `Unknown graphic type. Valid: ${VALID_GRAPHICS.join(', ')}` });
    }
    io.to(matchId || 'global').emit('companion-action', { type: 'SHOW_GRAPHIC', graphic: graphicType, matchId });
    io.emit('companion-action', { type: 'SHOW_GRAPHIC', graphic: graphicType, matchId });
    res.json({ ok: true, action: 'SHOW_GRAPHIC', graphic: graphicType });
});

app.post('/api/companion/timeout/:team', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Timeout ${team} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'TIMEOUT', teamId: team, matchId });
    io.emit('companion-action', { type: 'TIMEOUT', teamId: team, matchId });
    res.json({ ok: true, action: 'TIMEOUT', teamId: team });
});

app.post('/api/companion/clock/adjust', companionAuth, (req, res) => {
    const delta = parseInt(req.query.delta) || 0;
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Clock Adjust ${delta}s (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'CLOCK_ADJUST', delta, matchId });
    io.emit('companion-action', { type: 'CLOCK_ADJUST', delta, matchId });
    res.json({ ok: true, action: 'CLOCK_ADJUST', delta });
});

app.post('/api/companion/shotclock/override', companionAuth, (req, res) => {
    const seconds = parseInt(req.query.seconds) || 14;
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Shotclock Override to ${seconds}s (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'SHOTCLOCK_OVERRIDE', seconds, matchId });
    io.emit('companion-action', { type: 'SHOTCLOCK_OVERRIDE', seconds, matchId });
    res.json({ ok: true, action: 'SHOTCLOCK_OVERRIDE', seconds });
});

app.post('/api/companion/shotclock/adjust', companionAuth, (req, res) => {
    const delta = parseInt(req.query.delta) || 0;
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Shotclock Adjust ${delta}s (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'SHOTCLOCK_ADJUST', delta, matchId });
    io.emit('companion-action', { type: 'SHOTCLOCK_ADJUST', delta, matchId });
    res.json({ ok: true, action: 'SHOTCLOCK_ADJUST', delta });
});

app.post('/api/companion/card/:team/:type', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const type = req.params.type.toUpperCase();
    const matchId = req.headers['x-match-id'];
    const playerId = req.body.playerId || null;
    console.log(`[Companion] Action: Card ${type} for ${team} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'CARD', teamId: team, cardType: type, playerId, matchId });
    io.emit('companion-action', { type: 'CARD', teamId: team, cardType: type, playerId, matchId });
    res.json({ ok: true, action: 'CARD', teamId: team, cardType: type, playerId });
});

app.post('/api/companion/match/reset', companionAuth, (req, res) => {
    const matchId = req.headers['x-match-id'];
    console.log(`[Companion] Action: Match Reset (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'MATCH_RESET', matchId });
    io.emit('companion-action', { type: 'MATCH_RESET', matchId });
    res.json({ ok: true, action: 'MATCH_RESET' });
});

// Player Slot Metadata
app.get('/api/companion/state/players/:team/:slot/name/raw', companionAuth, (req, res) => {
    const { team, slot } = req.params;
    const match = getLatestMatchState();
    const t = team.toUpperCase() === 'HOME' ? match?.homeTeam : match?.awayTeam;
    const player = t?.players[parseInt(slot) - 1];
    res.json(player?.name ? `${player.number || ''} ${player.name.split(' ')[0]}`.trim() : '-');
});

app.get('/api/companion/state/players/:team/:slot/id/raw', companionAuth, (req, res) => {
    const { team, slot } = req.params;
    const match = getLatestMatchState();
    const t = team.toUpperCase() === 'HOME' ? match?.homeTeam : match?.awayTeam;
    const player = t?.players[parseInt(slot) - 1];
    res.json(player?.id || '-');
});

app.post('/api/companion/goal/:team/:playerId', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const playerId = req.params.playerId;
    const matchId = req.headers['x-match-id'];
    if (playerId === '-') return res.status(400).json({ error: 'No player in slot' });
    console.log(`[Companion] Action: Goal ${team} by Player ${playerId} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'PLAYER_GOAL', teamId: team, playerId, matchId });
    io.emit('companion-action', { type: 'PLAYER_GOAL', teamId: team, playerId, matchId });
    res.json({ ok: true, action: 'PLAYER_GOAL', teamId: team, playerId });
});

app.post('/api/companion/foul/:team/:playerId', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    const playerId = req.params.playerId;
    const matchId = req.headers['x-match-id'];
    if (playerId === '-') return res.status(400).json({ error: 'No player in slot' });
    console.log(`[Companion] Action: Foul ${team} by Player ${playerId} (Match: ${matchId || 'global'})`);
    io.to(matchId || 'global').emit('companion-action', { type: 'PLAYER_FOUL', teamId: team, playerId, matchId });
    io.emit('companion-action', { type: 'PLAYER_FOUL', teamId: team, playerId, matchId });
    res.json({ ok: true, action: 'PLAYER_FOUL', teamId: team, playerId });
});

// Expose the companion token (only on localhost) so the Manager UI can display it
app.get('/api/companion/token', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!ip.includes('127.0.0.1') && !ip.includes('::1') && !ip.includes('localhost')) {
        return res.status(403).json({ error: 'Token endpoint only accessible from localhost.' });
    }
    res.json({ token: COMPANION_TOKEN });
});

/**
 * GET /api/companion/setup-info
 * Returns all info needed by the Manager UI to display the QR code and connection details.
 * Open (no auth) because it only reveals the token to LAN users who could see it anyway.
 */
app.get('/api/companion/setup-info', async (req, res) => {
    let localIp = '127.0.0.1';
    try {
        const os = await import('os');
        const nets = os.networkInterfaces();
        for (const iface of Object.values(nets)) {
            for (const addr of (iface || [])) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    localIp = addr.address;
                    break;
                }
            }
            if (localIp !== '127.0.0.1') break;
        }
    } catch { }
    res.json({
        serverUrl: `http://${localIp}:${PORT}`,
        serverPort: PORT,
        localIp,
        token: COMPANION_TOKEN,
        companionUrl: companionPushUrl,
        activeMatchId,
        activeMatch: activeMatchId ? activeMatches.get(activeMatchId) : null
    });
});


// Companion Endpoints relocated for proper routing

/**
 * GET /api/companion/profile.json
 * Returns a Companion v3 importable JSON with pre-configured buttons.
 */
app.get('/api/companion/korfstat.companionconfig', companionAuth, async (req, res) => {
    const matchId = req.headers['x-match-id'];
    let s = null;
    if (matchId && activeMatches.has(matchId)) {
        s = activeMatches.get(matchId);
    } else {
        s = Array.from(activeMatches.values())[0] || getLatestMatchState();
    }
    const home = s?.homeTeam?.name ?? 'HOME';
    const away = s?.awayTeam?.name ?? 'AWAY';
    
    let localIp = '127.0.0.1';
    try {
        const os = await import('os');
        const nets = os.networkInterfaces();
        for (const iface of Object.values(nets)) {
            for (const addr of (iface || [])) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    localIp = addr.address;
                    break;
                }
            }
            if (localIp !== '127.0.0.1') break;
        }
    } catch { }

    const connectionId = 'ks-connection';
    const profile = {
        version: 9, 
        type: 'full', 
        companionBuild: '4.2.6+8823-stable-4ecdfe70ba',
        custom_variables: {},
        customVariables: {},
        customVariablesCollections: [{ id: "ks-vars", label: "KorfStat Pro", sortOrder: 0, children: [], metaData: { enabled: true } }],
        custom_variable_collections: [{ id: "ks-vars", label: "KorfStat Pro", sortOrder: 0, children: [], metaData: { enabled: true } }],
        trigger_collections: [
            { id: 'match-data', label: 'Match Data', sortOrder: 0, children: [], metaData: { enabled: true } },
            { id: 'team-names', label: 'Team Names', sortOrder: 1, children: [], metaData: { enabled: true } },
            { id: 'player-rosters', label: 'Player Rosters', sortOrder: 2, children: [], metaData: { enabled: true } },
            { id: 'match-state', label: 'Match State', sortOrder: 3, children: [], metaData: { enabled: true } }
        ],
        triggerCollections: [
            { id: 'match-data', label: 'Match Data', sortOrder: 0, children: [], metaData: { enabled: true } },
            { id: 'team-names', label: 'Team Names', sortOrder: 1, children: [], metaData: { enabled: true } },
            { id: 'player-rosters', label: 'Player Rosters', sortOrder: 2, children: [], metaData: { enabled: true } },
            { id: 'match-state', label: 'Match State', sortOrder: 3, children: [], metaData: { enabled: true } }
        ],
        pages: {
            "1": { id: "p1", name: "Main Control", controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
            "2": { id: "p2", name: "Monitoring", controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
            "3": { id: "p3", name: "Corrections", controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
            "4": { id: "p4", name: `Goal: ${home}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
            "5": { id: "p5", name: `Foul: ${home}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
            "6": { id: "p6", name: `Goal: ${away}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
            "7": { id: "p7", name: `Foul: ${away}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } }
        },
        triggers: {},
        pageCollections: [],
        expressionVariables: {},
        instances: {
            [connectionId]: {
                moduleInstanceType: "connection",
                instance_type: "generic-http",
                label: "KorfStat-Pro",
                enabled: true,
                config: { prefix: `http://${localIp}:${PORT}`, rejectUnauthorized: false }
            }
        },
        surfaces: {},
        surfaceInstances: {},
        surfaceGroups: {},
        connectionCollections: []
    };

    const varConfigs = [
        { name: 'ks_home', label: 'Home Score', path: '/api/companion/state/score/home/raw', collectionId: 'match-data' },
        { name: 'ks_away', label: 'Away Score', path: '/api/companion/state/score/away/raw', collectionId: 'match-data' },
        { name: 'ks_timer', label: 'Match Clock', path: '/api/companion/state/time/match/raw', collectionId: 'match-data' },
        { name: 'ks_shotclock', label: 'Shot Clock', path: '/api/companion/state/time/shotclock/raw', collectionId: 'match-data' },
        { name: 'ks_period', label: 'Period', path: '/api/companion/state/period/raw', collectionId: 'match-data' },
        { name: 'ks_timeouts_home', label: 'Home Timeouts', path: '/api/companion/state/timeouts/home/raw', collectionId: 'match-data' },
        { name: 'ks_timeouts_away', label: 'Away Timeouts', path: '/api/companion/state/timeouts/away/raw', collectionId: 'match-data' },
        { name: 'ks_fouls_home', label: 'Home Fouls', path: '/api/companion/state/fouls/home/raw', collectionId: 'match-data' },
        { name: 'ks_fouls_away', label: 'Away Fouls', path: '/api/companion/state/fouls/away/raw', collectionId: 'match-data' },
        { name: 'ks_name_home', label: 'Home Name', path: '/api/companion/state/names/home/raw', interval: 60000, collectionId: 'team-names' },
        { name: 'ks_name_away', label: 'Away Name', path: '/api/companion/state/names/away/raw', interval: 60000, collectionId: 'team-names' },
        { name: 'ks_running', label: 'Clock Running', path: '/api/companion/state/running/raw', collectionId: 'match-state' },
        { name: 'ks_last_event', label: 'Last Event', path: '/api/companion/state/last-event/raw', collectionId: 'match-state' }
    ];

    // Add Player Slot Variables (16 per team)
    ['home', 'away'].forEach(team => {
        for (let i = 1; i <= 16; i++) {
            varConfigs.push({ name: `ks_p${i}_name_${team}`, label: `${team.charAt(0).toUpperCase() + team.slice(1)} P${i} Name`, path: `/api/companion/state/players/${team}/${i}/name/raw`, interval: 30000, collectionId: 'player-rosters' });
            varConfigs.push({ name: `ks_p${i}_id_${team}`, label: `${team.charAt(0).toUpperCase() + team.slice(1)} P${i} ID`, path: `/api/companion/state/players/${team}/${i}/id/raw`, interval: 30000, collectionId: 'player-rosters' });
        }
    });

    varConfigs.forEach((v, idx) => {
        const varDef = {
            description: v.label, 
            defaultValue: v.name.includes('name') ? (v.name.includes('home') ? 'HOME' : 'AWAY') : (v.name.includes('id') ? '-' : '0'),
            persistCurrentValue: false, sortOrder: idx, collectionId: 'ks-vars'
        };
        profile.custom_variables[v.name] = varDef;
        profile.customVariables[v.name] = varDef;
        const interval = v.interval || 1000;
        profile.triggers[`trigger-${v.name}`] = {
            id: `trigger-${v.name}`,
            type: 'trigger',
            collectionId: v.collectionId || 'match-data',
            options: { 
                name: `Sync ${v.label}`, 
                interval: interval / 1000, 
                reset_on_start: false,
                enabled: true,
                sortOrder: idx
            },
            actions: [{ 
                id: `act-sync-${v.name}`, 
                definitionId: 'get', 
                connectionId: connectionId,
                enabled: true,
                options: { 
                    url: v.path, 
                    header: "",
                    body: "",
                    contenttype: "application/json"
                },
                type: 'action',
                upgradeIndex: -1
            }],
            condition: [],
            events: [{ 
                id: `event-${v.name}`, 
                type: 'interval', 
                enabled: true,
                options: { 
                    interval: interval / 1000
                } 
            }],
            localVariables: []
        };
    });

    const addButton = (pageId, r, c, options) => {
        const row = String(r);
        const col = String(c);
        const page = String(pageId);
        
        if (!profile.pages[page]) {
            profile.pages[page] = { 
                id: `p${page}`, 
                name: `Page ${page}`, 
                controls: {}, 
                gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } 
            };
        }
        if (!profile.pages[page].controls) profile.pages[page].controls = {};
        if (!profile.pages[page].controls[row]) profile.pages[page].controls[row] = {};
        const btn = {
            type: 'button',
            style: {
                text: options.text, 
                textExpression: options.isExpression || options.text.includes('$('), 
                size: 'auto',
                png64: null, alignment: 'center:center', pngalignment: 'center:center',
                color: options.textColor !== undefined ? options.textColor : 16777215,
                bgcolor: hexToDec(options.color || '#2D2D2D'), show_topbar: 'default'
            },
            options: { 
                stepProgression: 'auto',
                stepExpression: '',
                rotaryActions: false
            }, 
            feedbacks: [], 
            steps: {
                "0": {
                    action_sets: { down: [], up: [] },
                    options: { runWhileHeld: false }
                }
            },
            localVariables: []
        };
        if (options.path) {
            btn.steps["0"].action_sets.down.push({
                id: `act-${page}-${r}-${c}`, definitionId: 'post', connectionId: connectionId,
                enabled: true,
                options: { 
                    url: options.path, 
                    header: "", 
                    body: '{}',
                    contenttype: 'application/json'
                },
                type: 'action',
                upgradeIndex: -1
            });
        }
        if (options.jump) {
            btn.steps["0"].action_sets.down.push({
                id: `jump-${page}-${r}-${c}`, definitionId: 'set_page', connectionId: 'internal',
                enabled: true,
                options: { page: options.jump }, 
                type: 'action', 
                upgradeIndex: -1
            });
        }
        profile.pages[page].controls[row][col] = btn;
    };

    // --- PAGE 1: MAIN ---
    addButton("1", 0, 0, { text: 'MONITOR', color: '#10b981', jump: 2 });
    addButton("1", 0, 1, { text: 'Start | Pause', color: '#22c55e', path: '/api/companion/clock/toggle' });
    addButton("1", 0, 2, { text: 'Goal $(custom:ks_name_home)', color: '#ef4444', jump: 4 });
    addButton("1", 0, 3, { text: 'Goal $(custom:ks_name_away)', color: '#3b82f6', jump: 6 });
    addButton("1", 0, 5, { text: '$(custom:ks_shotclock)', color: '#000000' });
    addButton("1", 0, 6, { text: '$(custom:ks_timer)', color: '#000000' });
    addButton("1", 0, 7, { text: 'CORRECT', color: '#f59e0b', jump: 3 });
    addButton("1", 1, 1, { text: 'Next Per.', color: '#0ea5e9', path: '/api/companion/period/next' });
    addButton("1", 1, 2, { text: 'Foul $(custom:ks_name_home)', color: '#b91c1c', jump: 5 });
    addButton("1", 1, 3, { text: 'Foul $(custom:ks_name_away)', color: '#1d4ed8', jump: 7 });
    addButton("1", 1, 5, { text: '$(custom:ks_home)', color: '#000000' });
    addButton("1", 1, 6, { text: '$(custom:ks_away)', color: '#000000' });
    addButton("1", 2, 2, { text: 'Y. CARD H', color: '#eab308', textColor: 0, path: '/api/companion/card/home/YELLOW' });
    addButton("1", 2, 3, { text: 'Y. CARD A', color: '#eab308', textColor: 0, path: '/api/companion/card/away/YELLOW' });
    addButton("1", 2, 7, { text: 'Dismiss GFX', color: '#4b5563', path: '/api/companion/graphics/dismiss' });
    addButton("1", 3, 2, { text: 'R. CARD H', color: '#7f1d1d', path: '/api/companion/card/home/RED' });
    addButton("1", 3, 3, { text: 'R. CARD A', color: '#7f1d1d', path: '/api/companion/card/away/RED' });
    addButton("1", 3, 7, { text: '$(custom:ks_last_event)', color: '#1f2937' });

    // --- PAGE 2: MONITORING ---
    addButton("2", 0, 0, { text: 'BACK', color: '#4b5563', jump: 1 });
    addButton("2", 0, 2, { text: 'HOME: $(custom:ks_name_home)', color: '#ef4444' });
    addButton("2", 0, 3, { text: 'AWAY: $(custom:ks_name_away)', color: '#3b82f6' });
    addButton("2", 1, 1, { text: 'RUNNING: $(custom:ks_running)', color: '#374151' });
    addButton("2", 1, 2, { text: 'TIMEOUTS: $(custom:ks_fouls_home)', color: '#ef4444' }); // Reusing fouls for now if timeouts not tracked
    addButton("2", 1, 3, { text: 'TIMEOUTS: $(custom:ks_fouls_away)', color: '#3b82f6' });
    addButton("2", 1, 5, { text: 'PERIOD: $(custom:ks_period)', color: '#374151' });

    // --- PAGE 3: CORRECTIONS ---
    addButton("3", 0, 0, { text: 'BACK', color: '#4b5563', jump: 1 });
    addButton("3", 0, 1, { text: 'CLOCK +1m', color: '#22c55e', path: '/api/companion/clock/adjust?delta=60' });
    addButton("3", 0, 2, { text: 'CLOCK -1m', color: '#ef4444', path: '/api/companion/clock/adjust?delta=-60' });
    addButton("3", 0, 4, { text: 'SC 25s', color: '#6366f1', path: '/api/companion/shotclock/override?seconds=25' });
    addButton("3", 0, 5, { text: 'SC 14s', color: '#8b5cf6', path: '/api/companion/shotclock/override?seconds=14' });
    addButton("3", 1, 1, { text: 'CLOCK +1s', color: '#22c55e', path: '/api/companion/clock/adjust?delta=1' });
    addButton("3", 1, 2, { text: 'CLOCK -1s', color: '#ef4444', path: '/api/companion/clock/adjust?delta=-1' });
    addButton("3", 1, 4, { text: 'Reset Clock', color: '#4b5563', path: '/api/companion/clock/reset' });
    addButton("3", 1, 5, { text: 'Reset Shot', color: '#4b5563', path: '/api/companion/shotclock/reset' });
    addButton("3", 3, 7, { text: 'DANGER: RESET', color: '#7f1d1d', path: '/api/companion/match/reset' });

    const addPlayerButtons = (pageId, teamId, type) => {
        const teamLower = teamId.toLowerCase();
        addButton(pageId, 3, 0, { text: 'CANCEL', color: '#4b5563', jump: 1 });
        // Constant 16 slots for dynamic tagging
        for (let idx = 0; idx < 16; idx++) {
            const r = Math.floor(idx / 4);
            const c = (idx % 4) + 1;
            const slot = idx + 1;
            addButton(pageId, r, c, { 
                text: `$(custom:ks_p${slot}_name_${teamLower})`, 
                color: teamId === 'HOME' ? '#ef4444' : '#3b82f6',
                path: `/api/companion/${type}/${teamId}/$(custom:ks_p${slot}_id_${teamLower})`,
                jump: 1 
            });
        }
    };
    addPlayerButtons("4", "HOME", "goal");
    addPlayerButtons("5", "HOME", "foul");
    addPlayerButtons("6", "AWAY", "goal");
    addPlayerButtons("7", "AWAY", "foul");

    const json = JSON.stringify(profile);
    const gzipped = zlib.gzipSync(json);
    res.setHeader('Content-Type', 'application/x-gzip');
    res.setHeader('Content-Disposition', 'attachment; filename=korfstat-pro-v9.companionconfig');
    res.send(gzipped);
});

// ── Push-to-Companion Webhook System ──────────────────────────────────────────
// Companion exposes a custom-variables API at:
//   PUT http://companion:8888/api/1.0/custom-variables/<name>/current-value
// We push our match state variables there on every state change.

// companionPushUrl variable moved to top of file for auth middleware access
let companionPushTimeout = null;

/**
 * Push the current match state to Companion as named variables.
 * Called debounced (200ms) on every state change.
 */
async function pushToCompanion(state) {
    if (!companionPushUrl || !state) return;

    let homeScore = 0, awayScore = 0;
    if (state.events) {
        state.events.forEach(e => {
            if (e.type === 'GOAL' || e.result === 'GOAL') {
                if (e.teamId === 'HOME') homeScore++;
                else if (e.teamId === 'AWAY') awayScore++;
            }
        });
    }

    const pad = n => String(Math.floor(n)).padStart(2, '0');
    const clockSec = state.timer?.elapsedSeconds ?? 0;
    const clockDisplay = `${pad(clockSec / 60)}:${pad(clockSec % 60)}`;
    const shotSec = state.shotClock?.seconds ?? 0;
    const shotClockDisplay = String(Math.floor(shotSec));

    const lastEvent = state.events && state.events.length > 0 ? state.events[state.events.length - 1] : null;
    let lastEventStr = "No events yet";
    if (lastEvent) {
        const team = lastEvent.teamId === 'HOME' ? (state.homeTeam?.name || 'Home') : (state.awayTeam?.name || 'Away');
        if (lastEvent.type === 'SHOT' || lastEvent.result === 'GOAL') lastEventStr = `GOAL ${team}`;
        else if (lastEvent.type === 'FOUL') lastEventStr = `FOUL ${team}`;
        else if (lastEvent.type === 'TIMEOUT') lastEventStr = `TIMEOUT ${team}`;
        else if (lastEvent.type === 'SUBSTITUTION') lastEventStr = `SUB ${team}`;
    }

    const variables = {
        ks_home: homeScore,
        ks_away: awayScore,
        ks_match: clockDisplay,
        ks_shotclock: shotClockDisplay,
        ks_period: state.currentHalf ?? 1,
        ks_name_home: state.homeTeam?.name ?? 'Home',
        ks_name_away: state.awayTeam?.name ?? 'Away',
        ks_fouls_home: state.events?.filter(e => e.type === 'FOUL' && e.teamId === 'HOME').length || 0,
        ks_fouls_away: state.events?.filter(e => e.type === 'FOUL' && e.teamId === 'AWAY').length || 0,
        ks_running: state.timer?.isRunning ? '1' : '0',
        ks_last_event: lastEventStr
    };

    const base = `${companionPushUrl}/api/1.0/custom-variables`;
    await Promise.allSettled(
        Object.entries(variables).map(([name, value]) =>
            fetch(`${base}/custom_${name}/current-value`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(String(value)),
            }).catch(() => { }) 
        )
    );
    console.log(`[Companion Push] ${Object.keys(variables).length} variables pushed to ${companionPushUrl}`);
}

const debouncedPushToCompanion = (state) => {
    if (companionPushTimeout) clearTimeout(companionPushTimeout);
    companionPushTimeout = setTimeout(() => pushToCompanion(state), 200);
};

/**
 * POST /api/companion/configure
 * Lets the Manager UI set (or clear) the Companion push URL at runtime.
 */
app.post('/api/companion/configure', companionAuth, (req, res) => {
    const { companionUrl } = req.body;
    if (companionUrl !== undefined) {
        companionPushUrl = companionUrl || '';
        console.log(`[Companion] Push URL set to: "${companionPushUrl || '(disabled)'}"`);
    }
    res.json({ ok: true, companionUrl: companionPushUrl });
});

/**
 * POST /api/companion/push (incoming webhook FROM Companion to us)
 * Companion can call this to push variable/trigger data to KorfStat.
 * Currently logs and echoes; can be extended to handle Companion-side triggers.
 */
app.post('/api/companion/push', companionAuth, (req, res) => {
    const payload = req.body;
    console.log('[Companion] Inbound push from Companion:', JSON.stringify(payload));
    // Re-broadcast as a companion-action so the tracker UI can react
    if (payload?.action) {
        io.emit('companion-action', payload);
    }
    res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/match/:id', (req, res) => {
    const match = activeMatches.get(req.params.id) || getMatchState(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
});

// GET all active matches for the discovery UI
app.get('/api/matches/active', (req, res) => {
    res.json(Array.from(activeMatches.values()));
});

// DELETE an active match
app.delete('/api/matches/active/:id', (req, res) => {
    const matchId = req.params.id;
    if (activeMatches.has(matchId)) {
        activeMatches.delete(matchId);
        console.log(`[Server] Match ${matchId} manually marked as finished and removed from active memory.`);
    }
    res.json({ ok: true });
});

// --- Match Templates API ---
app.get('/api/templates', (req, res) => {
    res.json(getAllTemplates());
});

app.post('/api/templates', (req, res) => {
    const template = req.body;
    if (!template || !template.id || !template.name) {
        return res.status(400).json({ error: 'Invalid template data' });
    }
    saveMatchTemplate(template);
    res.json({ ok: true });
});

app.delete('/api/templates/:id', (req, res) => {
    deleteTemplate(req.params.id);
    res.json({ ok: true });
});



const connectedClients = new Map(); // socketId -> { id, view, ip, userAgent, connectedAt }

// --- Spectator Voting State ---
let currentVotes = {}; // playerId -> count
let votedIps = new Set(); // Keep it simple: prevent double voting by IP

// Load last known active matches from DB (simplified: load all from last 24h OR latest)
const latestState = getLatestMatchState();
if (latestState) {
    activeMatches.set(latestState.id, latestState);
    console.log(`Loaded latest match state from DB: ${latestState.id}`);
} else {
    console.log('No existing match state found. Starting fresh.');
}

// Throttle DB saves so we don't spam SQLite 60 times a second if clocks run fast.
let saveTimeout = null;
const throttledSave = (state) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveMatchState(state);
    }, 500); // Save at most every 500ms
};

// Reset votes on new match or manual reset
const resetVotes = (matchId) => {
    // Voting might also need to be match-specific?
    // For now, keep it global or scope by matchId if possible.
    currentVotes = {};
    votedIps.clear();
    io.to(matchId || 'global').emit('vote-update', currentVotes);
};

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Get IP - messy in Node/Express/Socket.io behind proxies sometimes, but valid for local
    const clientIp = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];

    // Default entry
    connectedClients.set(socket.id, {
        id: socket.id,
        view: 'Unknown',
        ip: clientIp,
        userAgent: userAgent,
        connectedAt: Date.now()
    });

    // Broadcast list immediately (so they show up as "Unknown" or just connected)
    io.emit('active-sessions', Array.from(connectedClients.values()));

    // Send current votes
    socket.emit('vote-update', currentVotes);

    socket.on('join-match', (matchId) => {
        if (!matchId) return;
        socket.join(matchId);
        console.log(`[Socket] Client ${socket.id} joined match ${matchId}`);
        
        // Send current state for this match
        const state = activeMatches.get(matchId) || getMatchState(matchId);
        if (state) {
            activeMatches.set(matchId, state); // Ensure it's in memory
            socket.emit('match-update', state);
            const tickerData = getTickerData(state);
            socket.emit('ticker-update', tickerData);
        }
    });

    socket.on('leave-match', (matchId) => {
        socket.leave(matchId);
        console.log(`[Socket] Client ${socket.id} left match ${matchId}`);
    });

    socket.on('register-view', (viewName) => {
        const client = connectedClients.get(socket.id);
        if (client) {
            client.view = viewName;
            connectedClients.set(socket.id, client); // Update
            io.emit('active-sessions', Array.from(connectedClients.values()));
        }
    });

    // Relay haptic signals directly to the watch
    socket.on('haptic-signal', (payload) => {
        io.emit('haptic-signal', payload);
    });

    // Relay write-mode actions from the watch back to the web app
    socket.on('watch-action', (payload) => {
        console.log('[Watch] Received watch-action:', payload?.action, 'for match:', payload?.matchId);
        // Broadcast to specific match room
        const room = payload?.matchId || 'global';
        socket.broadcast.to(room).emit('watch-action', payload);
    });

    socket.on('match-update', (state) => {
        if (!state || !state.id) return;
        const matchId = state.id;
        activeMatches.set(matchId, state);
        activeMatchId = matchId; // Track most recently updated match
        activeMatchId = matchId; // Set as most recently active match

        // Save to SQLite
        throttledSave(state);

        // Push variables to Companion (debounced, no-op if URL not configured)
        debouncedPushToCompanion(state);

        // Broadcast to specifically this match room
        socket.broadcast.to(matchId).emit('match-update', state);

        // Broadcast simplified ticker data to all clients in that match room
        const tickerData = getTickerData(state);
        io.to(matchId).emit('ticker-update', tickerData);

        // --- Watch Flattening specific mapping ---
        try {
            let homeScore = 0;
            let awayScore = 0;
            if (state.events) {
                homeScore = state.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === state.homeTeam.id).length;
                awayScore = state.events.filter(e => (e.type === 'SHOT' || e.type === 'GOAL') && e.result === 'GOAL' && e.teamId === state.awayTeam.id).length;
            }

            const watchPayload = {
                matchId,
                homeScore: homeScore,
                awayScore: awayScore,
                isGameTimeRunning: state.timer ? state.timer.isRunning : false,
                isShotClockRunning: state.shotClock ? state.shotClock.isRunning : false,
                gameTime: state.timer ? ((state.halfDurationSeconds - state.timer.elapsedSeconds) * 1000) : 0,
                shotClock: state.shotClock ? (state.shotClock.seconds * 1000) : 0,
                period: state.currentHalf || 1,
                subPending: false,
                latestSubId: '',
                subOut: '',
                subIn: '',
                isReadOnly: true,
                timeoutTeam: state.timeout && state.timeout.isActive ? "ACTIVE" : "NONE"
            };

            // Broadcast flattened representation explicitly for wear OS clients
            io.to(matchId).emit('watch-update', watchPayload);

        } catch (e) { }
    });

    socket.on('request-active-sessions', () => {
        socket.emit('active-sessions', Array.from(connectedClients.values()));
    });

    // Handle Spotter Actions (Relay to Tracker)
    socket.on('spotter-action', (action) => {
        console.log('Spotter action received:', action.type, 'for match:', action.matchId);
        // Broadcast to specific match room
        const room = action.matchId || 'global';
        socket.broadcast.to(room).emit('spotter-action', action);
    });

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
        if (connectedClients.has(socket.id)) {
            connectedClients.delete(socket.id);
            const remaining = Array.from(connectedClients.values());
            console.log('Broadcasting active sessions update. Remaining:', remaining.length);
            io.emit('active-sessions', remaining);
        } else {
            console.log('Client not found in connectedClients map during disconnect');
        }
    });

    // --- Voting Handlers ---
    socket.on('vote-cast', (playerId) => {
        const ip = socket.handshake.address;
        if (votedIps.has(ip)) {
            socket.emit('vote-error', 'You have already voted.');
            return;
        }

        currentVotes[playerId] = (currentVotes[playerId] || 0) + 1;
        votedIps.add(ip);
        
        console.log(`[Vote] Cast for ${playerId} from ${ip}`);
        io.emit('vote-update', currentVotes);
    });

    socket.on('vote-reset', (matchId) => {
        // Simple auth check: only Tracker/Director can reset
        const client = connectedClients.get(socket.id);
        if (client?.view === 'TRACKER' || client?.view === 'DIRECTOR') {
            console.log(`[Vote] Resetting votes for match: ${matchId}`);
            resetVotes(matchId);
        }
    });
});

// Helper to extract simplified ticker data
function getTickerData(state) {
    if (!state) return null;

    // Calculate simple score from event log if running sum not explicitly stored, 
    // but usually matchState has scores. If not, let's look at logic.
    // The client sends the full state. Let's assume it has team names and we can derive score if needed
    // or if the client sends score.
    // Looking at previous code, matchState has `homeTeam` and `awayTeam` but score is often derived from events.
    // Let's derive it safely here to be sure.
    let homeScore = 0;
    let awayScore = 0;
    let lastEvent = null;

    if (state.events) {
        state.events.forEach(e => {
            if (e.type === 'SHOT' && e.result === 'GOAL') {
                if (e.teamId === 'HOME') homeScore++;
                else awayScore++;
            }
        });
        // Find last significant event
        const significantEvents = state.events.filter(e => ['SHOT', 'SUBSTITUTION', 'TIMEOUT', 'CARD'].includes(e.type));
        if (significantEvents.length > 0) {
            lastEvent = significantEvents[significantEvents.length - 1]; // Last one
        }
    }

    return {
        matchId: state.matchId,
        status: state.status || 'IN_PROGRESS',
        clock: {
            period: state.period || 1, // Default to 1 if undefined
            timerRunning: state.timerRunning,
            timeRemaining: state.timeRemaining,
            // Calculate current minute of play (1 - 50) based on last known state
            // Korfball: 2 halves of 25 mins. 
            // If Period 1: (25 - timeRemaining/60)
            // If Period 2: 25 + (25 - timeRemaining/60)
            // Note: If timer is running, this snapshot might be slightly stale by the time it reaches client,
            // but for minute-level granularity it's fine.
            currentMinute: Math.ceil(((state.period || 1) - 1) * 25 + (25 - (state.timeRemaining / 60)))
        },
        score: {
            home: homeScore,
            away: awayScore,
            homeTeam: state.homeTeam?.name || 'Home',
            awayTeam: state.awayTeam?.name || 'Away',
            homeColor: state.homeTeam?.color || 'blue',
            awayColor: state.awayTeam?.color || 'red'
        },
        lastEvent: lastEvent ? {
            type: lastEvent.type,
            description: getEventDescription(lastEvent, state),
            timestamp: lastEvent.timestamp
        } : null
    };
}

function getEventDescription(event, state) {
    if (!event) return '';
    const player = event.playerId ? (
        state.homeTeam.players.find(p => p.id === event.playerId) ||
        state.awayTeam.players.find(p => p.id === event.playerId)
    ) : null;
    const playerName = player ? player.name : 'Unknown Player';

    switch (event.type) {
        case 'SHOT': return `${event.result === 'GOAL' ? 'GOAL' : 'Miss'} by ${playerName}`;
        case 'SUBSTITUTION': return `Sub: ${playerName} ${event.subType === 'IN' ? 'In' : 'Out'}`; // Simplify
        case 'CARD': return `${event.cardType} Card for ${playerName}`;
        default: return event.type;
    }
}

// REST API Endpoints
app.get('/api/match/:id', (req, res) => {
    const match = activeMatches.get(req.params.id) || getMatchState(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
});

app.get('/api/ticker/:id', (req, res) => {
    const match = activeMatches.get(req.params.id) || getMatchState(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(getTickerData(match));
});

app.get('/api/votes', (req, res) => {
    res.json(currentVotes);
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connections: connectedClients.size,
        activeMatches: activeMatches.size
    });
});

// SPA Catch-all route for React Router (Express 5 compatible)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    const now = new Date().toISOString();
    console.log(`✅ [${now}] KorfStat Pro Server running on port ${PORT} (all interfaces)`);
    console.log(`📡 [${now}] WebSocket server ready for real-time sync`);
    console.log(`🏥 [${now}] Health check available at http://localhost:${PORT}/health`);
    console.log(`🚀 [${now}] Happy Korfing! (BYPASS ACTIVE)`);
});

