const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow CORS from environment variable or default origins
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://192.168.1.205:5173"]
  : ["http://localhost:5173", "http://192.168.1.205:5173"];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let messages = [];
let users = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    users.set(socket.id, username);
    socket.emit('history', messages);
    io.emit('user-joined', { username, userId: socket.id });
  });

  socket.on('message', (data) => {
    const msg = {
      id: Date.now(),
      username: users.get(socket.id),
      text: data.text,
      timestamp: new Date().toISOString()
    };
    messages.push(msg);
    if (messages.length > 50) messages.shift();
    io.emit('message', msg);
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    io.emit('user-left', { username, userId: socket.id });
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
