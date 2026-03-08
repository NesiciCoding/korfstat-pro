import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { saveMatchState, getLatestMatchState } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port defined early so it's available to all route handlers
const PORT = process.env.PORT || 3002;

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
        origin: allowedOrigins.length > 0 && allowedOrigins[0] !== '*' ? allowedOrigins : "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Serve static frontend files from Vite dist folder
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

// ─────────────────────────────────────────────────────────────────────────────
// Bitfocus Companion / Button-Box REST API
// ─────────────────────────────────────────────────────────────────────────────

// Simple token auth — displayed in the Manager UI.
// Default: 'korfstat' so it works out of the box; users can override via env var.
const COMPANION_TOKEN = process.env.COMPANION_TOKEN || 'korfstat';

const companionAuth = (req, res, next) => {
    const token = req.headers['x-companion-token'];
    if (token !== COMPANION_TOKEN) {
        return res.status(401).json({ error: 'Invalid or missing X-Companion-Token header.' });
    }
    next();
};

/**
 * GET /api/companion/status
 * Companion polls this endpoint to update button labels and LED colours.
 * Returns a flat object with all key match values.
 */
app.get('/api/companion/status', companionAuth, (req, res) => {
    const s = currentState;
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
    const s = currentState;
    const home = s?.homeTeam?.name ?? 'HOME';
    const away = s?.awayTeam?.name ?? 'AWAY';
    const isRunning = s?.clock?.isRunning ?? false;

    res.json([
        { id: 'clock_toggle',    label: isRunning ? '⏸ Pause Clock' : '▶ Start Clock', color: isRunning ? '#f59e0b' : '#22c55e', action: 'POST /api/companion/clock/toggle' },
        { id: 'clock_reset',     label: '⟳ Reset Clock',   color: '#6366f1', action: 'POST /api/companion/clock/reset' },
        { id: 'shot_reset',      label: '⏱ Shot Clock',    color: '#8b5cf6', action: 'POST /api/companion/shotclock/reset' },
        { id: 'goal_home',       label: `⚽ Goal ${home}`, color: '#ef4444', action: 'POST /api/companion/goal/home' },
        { id: 'goal_away',       label: `⚽ Goal ${away}`, color: '#3b82f6', action: 'POST /api/companion/goal/away' },
        { id: 'undo_home',       label: `↩ Undo ${home}`,  color: '#78716c', action: 'POST /api/companion/goal/home/undo' },
        { id: 'undo_away',       label: `↩ Undo ${away}`,  color: '#78716c', action: 'POST /api/companion/goal/away/undo' },
        { id: 'foul_home',       label: `⚠ Foul ${home}`, color: '#f97316', action: 'POST /api/companion/foul/home' },
        { id: 'foul_away',       label: `⚠ Foul ${away}`, color: '#f97316', action: 'POST /api/companion/foul/away' },
        { id: 'period_next',     label: '⏭ Next Period',   color: '#0ea5e9', action: 'POST /api/companion/period/next' },
        { id: 'gfx_lineup',     label: '📋 Show Lineup',  color: '#14b8a6', action: 'POST /api/companion/graphics/lineup' },
        { id: 'gfx_halftime',   label: '🕐 Halftime',     color: '#14b8a6', action: 'POST /api/companion/graphics/halftime' },
        { id: 'gfx_goal',       label: '🎉 Goal Graphic', color: '#14b8a6', action: 'POST /api/companion/graphics/goal_celebration' },
        { id: 'gfx_dismiss',    label: '✖ Dismiss GFX',  color: '#6b7280', action: 'POST /api/companion/graphics/dismiss' },
        { id: 'status',         label: 'Score Display',   color: '#1e293b', action: 'GET /api/companion/status' },
    ]);
});

// ── Companion Action Endpoints ──────────────────────────────────────────────

app.post('/api/companion/clock/toggle', companionAuth, (req, res) => {
    io.emit('companion-action', { type: 'CLOCK_TOGGLE' });
    res.json({ ok: true, action: 'CLOCK_TOGGLE' });
});

app.post('/api/companion/clock/reset', companionAuth, (req, res) => {
    io.emit('companion-action', { type: 'CLOCK_RESET' });
    res.json({ ok: true, action: 'CLOCK_RESET' });
});

app.post('/api/companion/shotclock/reset', companionAuth, (req, res) => {
    io.emit('companion-action', { type: 'SHOTCLOCK_RESET' });
    res.json({ ok: true, action: 'SHOTCLOCK_RESET' });
});

app.post('/api/companion/goal/:team', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase(); // 'HOME' or 'AWAY'
    if (!['HOME', 'AWAY'].includes(team)) return res.status(400).json({ error: 'Team must be home or away' });
    io.emit('companion-action', { type: 'GOAL', teamId: team });
    res.json({ ok: true, action: 'GOAL', teamId: team });
});

app.post('/api/companion/goal/:team/undo', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    if (!['HOME', 'AWAY'].includes(team)) return res.status(400).json({ error: 'Team must be home or away' });
    io.emit('companion-action', { type: 'GOAL_UNDO', teamId: team });
    res.json({ ok: true, action: 'GOAL_UNDO', teamId: team });
});

app.post('/api/companion/foul/:team', companionAuth, (req, res) => {
    const team = req.params.team.toUpperCase();
    if (!['HOME', 'AWAY'].includes(team)) return res.status(400).json({ error: 'Team must be home or away' });
    io.emit('companion-action', { type: 'FOUL', teamId: team });
    res.json({ ok: true, action: 'FOUL', teamId: team });
});

app.post('/api/companion/period/next', companionAuth, (req, res) => {
    io.emit('companion-action', { type: 'PERIOD_NEXT' });
    res.json({ ok: true, action: 'PERIOD_NEXT' });
});

app.post('/api/companion/graphics/:type', companionAuth, (req, res) => {
    const graphicType = req.params.type;
    const VALID_GRAPHICS = ['lineup', 'halftime', 'goal_celebration', 'stats', 'dismiss'];
    if (!VALID_GRAPHICS.includes(graphicType)) {
        return res.status(400).json({ error: `Unknown graphic type. Valid: ${VALID_GRAPHICS.join(', ')}` });
    }
    io.emit('companion-action', { type: 'SHOW_GRAPHIC', graphic: graphicType });
    res.json({ ok: true, action: 'SHOW_GRAPHIC', graphic: graphicType });
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
    } catch {}
    res.json({
        serverUrl: `http://${localIp}:${PORT}`,
        serverPort: PORT,
        localIp,
        token: COMPANION_TOKEN,
        companionUrl: companionPushUrl,
    });
});

/**
 * GET /api/companion/profile.json
 * Returns a Companion v3 importable JSON with pre-configured buttons.
 */
app.get('/api/companion/profile.json', companionAuth, (req, res) => {
    const s = currentState;
    const home = s?.homeTeam?.name ?? 'HOME';
    const away = s?.awayTeam?.name ?? 'AWAY';
    const baseUrl = `http://127.0.0.1:${PORT}`;

    // Companion v3 Generic HTTP module connection + button layout
    const profile = {
        version: 4,
        _comment: 'KorfStat Pro — Companion Profile. Import via Settings > Import/Export.',
        connections: {
            'korfstat-http': {
                instance_type: 'generic-http',
                label: 'KorfStat Pro',
                config: {
                    base_url: baseUrl,
                    default_headers: [
                        { key: 'X-Companion-Token', value: COMPANION_TOKEN },
                        { key: 'Content-Type', value: 'application/json' },
                    ],
                },
                enabled: true,
            },
        },
        buttons: [
            { location: '0/0', label: '▶ Clock',       style: { color: '#22c55e', size: '18' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/clock/toggle' } }] },
            { location: '0/1', label: '⟳ Reset',      style: { color: '#6366f1', size: '18' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/clock/reset' } }] },
            { location: '0/2', label: '⏱ Shot Cl.',   style: { color: '#8b5cf6', size: '18' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/shotclock/reset' } }] },
            { location: '1/0', label: `⚽ ${home}`,   style: { color: '#ef4444', size: '18' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/goal/home' } }] },
            { location: '1/1', label: `⚽ ${away}`,   style: { color: '#3b82f6', size: '18' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/goal/away' } }] },
            { location: '1/2', label: `↩ ${home}`,   style: { color: '#78716c', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/goal/home/undo' } }] },
            { location: '1/3', label: `↩ ${away}`,   style: { color: '#78716c', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/goal/away/undo' } }] },
            { location: '2/0', label: `⚠ ${home}`,   style: { color: '#f97316', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/foul/home' } }] },
            { location: '2/1', label: `⚠ ${away}`,   style: { color: '#f97316', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/foul/away' } }] },
            { location: '2/2', label: '⏭ Period',     style: { color: '#0ea5e9', size: '18' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/period/next' } }] },
            { location: '3/0', label: '📋 Lineup',    style: { color: '#14b8a6', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/graphics/lineup' } }] },
            { location: '3/1', label: '🕐 Halftime',  style: { color: '#14b8a6', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/graphics/halftime' } }] },
            { location: '3/2', label: '🎉 Goal GFX',  style: { color: '#14b8a6', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/graphics/goal_celebration' } }] },
            { location: '3/3', label: '✖ Dismiss',   style: { color: '#6b7280', size: '14' }, actions: [{ type: 'generic-http:post', options: { path: '/api/companion/graphics/dismiss' } }] },
        ],
    };

    res.setHeader('Content-Disposition', 'attachment; filename="korfstat-companion.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(profile);
});

// ── Push-to-Companion Webhook System ──────────────────────────────────────────
// Companion exposes a custom-variables API at:
//   PUT http://companion:8888/api/1.0/custom-variables/<name>/current-value
// We push our match state variables there on every state change.

let companionPushUrl = process.env.COMPANION_URL || ''; // e.g. http://localhost:8888
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
    const clockSec = state.clock?.elapsed ?? 0;
    const clockDisplay = `${pad(clockSec / 60)}:${pad(clockSec % 60)}`;
    const shotSec = state.shotClock?.elapsed ?? 0;
    const shotClockDisplay = `${pad(shotSec / 60)}:${pad(shotSec % 60)}`;

    const variables = {
        scoreHome: homeScore,
        scoreAway: awayScore,
        scoreDisplay: `${homeScore} - ${awayScore}`,
        homeTeamName: state.homeTeam?.name ?? 'Home',
        awayTeamName: state.awayTeam?.name ?? 'Away',
        clockDisplay,
        shotClockDisplay,
        period: state.currentPeriod ?? 1,
        isRunning: state.clock?.isRunning ? '1' : '0',
    };

    const base = `${companionPushUrl}/api/1.0/custom-variables`;
    await Promise.allSettled(
        Object.entries(variables).map(([name, value]) =>
            fetch(`${base}/korfstat_${name}/current-value`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(String(value)),
            }).catch(() => {}) // silently absorb network errors
        )
    );
    console.log(`[Companion Push] Variables pushed to ${companionPushUrl}`);
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

app.get('/api/match', (req, res) => {
    res.json(getLatestMatchState() || {});
});



const connectedClients = new Map(); // socketId -> { id, view, ip, userAgent, connectedAt }

// Load last known state from DB
let currentState = getLatestMatchState();
if (currentState) {
    console.log(`Loaded existing match state from DB: ${currentState.id}`);
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

    // Send current state to new client if available
    if (currentState) {
        socket.emit('match-update', currentState);
        const tickerData = getTickerData(currentState);
        socket.emit('ticker-update', tickerData);
    }

    socket.on('register-view', (viewName) => {
        const client = connectedClients.get(socket.id);
        if (client) {
            client.view = viewName;
            connectedClients.set(socket.id, client); // Update
            io.emit('active-sessions', Array.from(connectedClients.values()));
        }
    });

    socket.on('match-update', (state) => {
        currentState = state;

        // Save to SQLite
        throttledSave(state);

        // Push variables to Companion (debounced, no-op if URL not configured)
        debouncedPushToCompanion(state);

        // Broadcast to all other clients
        socket.broadcast.emit('match-update', state);

        // Broadcast simplified ticker data to all clients (including external tickers)
        const tickerData = getTickerData(state);
        io.emit('ticker-update', tickerData);
    });

    socket.on('request-active-sessions', () => {
        socket.emit('active-sessions', Array.from(connectedClients.values()));
    });

    // Handle Spotter Actions (Relay to Tracker)
    socket.on('spotter-action', (action) => {
        console.log('Spotter action received:', action.type);
        // Broadcast to all clients (Tracker will pick this up)
        socket.broadcast.emit('spotter-action', action);
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
app.get('/api/match', (req, res) => {
    res.json(currentState || { message: "No active match" });
});

app.get('/api/ticker', (req, res) => {
    if (!currentState) return res.status(404).json({ message: "No active match" });
    res.json(getTickerData(currentState));
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connections: connectedClients.size,
        hasActiveMatch: currentState !== null
    });
});

// SPA Catch-all route for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`✅ KorfStat Pro Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time sync`);
    console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});

