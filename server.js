const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from the 'public' folder
app.use(express.static('public'));

// In-memory store for active rooms
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle joining a room
    socket.on('join-room', (roomId) => {
        // Leave any previous rooms first to avoid cross-talk
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.leave(room);
            }
        }

        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        // Initialize room state if it doesn't exist yet
        if (!rooms[roomId]) {
            rooms[roomId] = {
                grid: null,
                currentRound: 1,
                turnIndex: 0,
                limitActive: true
            };
        }

        // Send the current room state to the newly joined player
        socket.emit('sync-state', rooms[roomId]);
    });

    // Handle single cell updates and sync across the room
    socket.on('update-cell', ({ room, r, c, color }) => {
        if (!rooms[room]) return;

        // If grid isn't initialized in memory yet, create a default blank one
        if (!rooms[room].grid) {
            rooms[room].grid = Array(40).fill(null).map(() => Array(60).fill(null));
        }

        if (r >= 0 && r < rooms[room].grid.length && c >= 0 && c < rooms[room].grid[0].length) {
            rooms[room].grid[r][c] = color;
            // Broadcast to everyone else in the room
            socket.to(room).emit('update-cell', { r, c, color });
        }
    });

    // Handle passing the turn
    socket.on('pass-turn', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].turnIndex++;
            socket.to(roomId).emit('pass-turn');
        }
    });

    // Handle clearing the grid
    socket.on('clear-grid', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].grid = null;
            rooms[roomId].currentRound = 1;
            rooms[roomId].turnIndex = 0;
            rooms[roomId].limitActive = true;
            socket.to(roomId).emit('clear-grid');
        }
    });

    // Handle randomization
    socket.on('randomize', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].currentRound = 1;
            rooms[roomId].turnIndex = 0;
            rooms[roomId].limitActive = true;
            socket.to(roomId).emit('randomize');
        }
    });

    // Handle toggling auto-play
    socket.on('toggle-play', (roomId) => {
        socket.to(roomId).emit('toggle-play');
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});