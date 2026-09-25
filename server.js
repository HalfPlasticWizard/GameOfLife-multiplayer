const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve your public folder (where index.html lives)
app.use(express.static('public'));

// Track the state of active rooms
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a player joins a specific room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        // If the room doesn't exist yet, create a default state for it
        if (!rooms[roomId]) {
            rooms[roomId] = {
                grid: null,
                currentRound: 1,
                turnIndex: 0,
                limitActive: true
            };
        }

        // Send the current room state to the newly joined player
        socket.emit('init-state', rooms[roomId]);
    });

    // Listen for grid updates or turn passes from any client
    socket.on('update-state', ({ roomId, grid, currentRound, turnIndex, limitActive }) => {
        if (rooms[roomId]) {
            rooms[roomId].grid = grid;
            rooms[roomId].currentRound = currentRound;
            rooms[roomId].turnIndex = turnIndex;
            rooms[roomId].limitActive = limitActive;

            // Send the updated state to everyone else in that room
            socket.to(roomId).emit('sync-state', rooms[roomId]);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});