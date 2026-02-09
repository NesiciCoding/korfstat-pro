import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin for local dev
        methods: ["GET", "POST"]
    }
});

const connectedClients = new Map(); // socketId -> { id, view, ip, userAgent, connectedAt }

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
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket.id);
        io.emit('active-sessions', Array.from(connectedClients.values()));
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
});
