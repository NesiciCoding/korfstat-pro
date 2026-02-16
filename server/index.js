import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

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

const connectedClients = new Map(); // socketId -> { id, view, ip, userAgent, connectedAt }
let currentState = null;

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
        // console.log('Received match update from', socket.id);
        currentState = state;
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

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`✅ KorfStat Pro Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time sync`);
    console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});

