const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static('public'));

// Track the state of active rooms
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                grid: null,
                currentRound: 1,
                turnIndex: 0,
                limitActive: true
            };
        }

        // Send current state to the newly joined player
        socket.emit('sync-state', rooms[roomId]);
    });

    // Handle individual cell updates and broadcast to room
    socket.on('update-cell', ({ room, r, c, color }) => {
        if (rooms[room]) {
            // Optional: update server-stored grid if needed, or just broadcast
            socket.to(room).emit('update-cell', { r, c, color });
        }
    });

    // Handle turn passing
    socket.on('pass-turn', (room) => {
        socket.to(room).emit('pass-turn');
    });

    // Handle grid clearing
    socket.on('clear-grid', (room) => {
        socket.to(room).emit('clear-grid');
    });

    // Handle randomization
    socket.on('randomize', (room) => {
        socket.to(room).emit('randomize');
    });

    // Handle auto-play toggle
    socket.on('toggle-play', (room) => {
        socket.to(room).emit('toggle-play');
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});