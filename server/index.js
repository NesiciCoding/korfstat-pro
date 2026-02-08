import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const DATA_FILE = path.join(__dirname, 'data.json');

// --- STATE ---
let matchState = null;
let savedMatches = [];

// Load from disk
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        matchState = data.matchState || null;
        savedMatches = data.savedMatches || [];
        console.log('Loaded data from disk.');
    }
} catch (e) {
    console.error('Failed to load data:', e);
}

const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ matchState, savedMatches }, null, 2));
    } catch (e) {
        console.error('Failed to save data:', e);
    }
};

// Locks: ViewName -> ClientID
const viewLocks = new Map();
const clients = new Map();

const broadcast = (message, excludeClientId = null) => {
    const data = JSON.stringify(message);
    clients.forEach((client, id) => {
        if (id !== excludeClientId && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID();
    clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    // Send initial sync
    ws.send(JSON.stringify({
        type: 'SYNC_STATE',
        payload: { matchState, savedMatches }
    }));

    // Send current locks
    ws.send(JSON.stringify({
        type: 'LOCK_UPDATE',
        payload: Array.from(viewLocks.entries())
    }));

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);
            const { type, payload } = parsed;

            switch (type) {
                case 'REGISTER_VIEW': {
                    const { view } = payload;
                    if (view === 'LIVESTREAM_STATS' || view === 'LIVE' || view === 'STATS') {
                        return;
                    }
                    const currentLock = viewLocks.get(view);
                    if (currentLock && currentLock !== clientId) {
                        ws.send(JSON.stringify({
                            type: 'LOCK_ERROR',
                            payload: { view, lockedBy: currentLock }
                        }));
                    } else {
                        viewLocks.set(view, clientId);
                        broadcast({
                            type: 'LOCK_UPDATE',
                            payload: Array.from(viewLocks.entries())
                        });
                        ws.send(JSON.stringify({ type: 'LOCK_SUCCESS', payload: { view } }));
                    }
                    break;
                }

                case 'UNLOCK_VIEW': {
                    const { view } = payload;
                    if (viewLocks.get(view) === clientId) {
                        viewLocks.delete(view);
                        broadcast({
                            type: 'LOCK_UPDATE',
                            payload: Array.from(viewLocks.entries())
                        });
                    }
                    break;
                }

                case 'UPDATE_STATE': {
                    matchState = payload;
                    saveData();
                    broadcast({
                        type: 'UPDATE_STATE',
                        payload: matchState
                    }, clientId);
                    break;
                }

                case 'UPDATE_HISTORY': {
                    savedMatches = payload;
                    saveData();
                    broadcast({
                        type: 'UPDATE_HISTORY',
                        payload: savedMatches
                    }, clientId);
                    break;
                }
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(clientId);

        let locksChanged = false;
        for (const [view, owner] of viewLocks.entries()) {
            if (owner === clientId) {
                viewLocks.delete(view);
                locksChanged = true;
            }
        }

        if (locksChanged) {
            broadcast({
                type: 'LOCK_UPDATE',
                payload: Array.from(viewLocks.entries())
            });
        }
    });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`KorfStat Pro Server running on port ${PORT}`);
});
