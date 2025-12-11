const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

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

// MongoDB connection
let isMongoConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simple-chat';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000,
  socketTimeoutMS: 3000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    isMongoConnected = true;
  })
  .catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Running in memory-only mode');
    isMongoConnected = false;
  });

// Message Schema
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  avatar: { type: String }
});

const Message = mongoose.model('Message', messageSchema);

// In-memory message storage (fallback)
let memoryMessages = [];

// Store active users and typing status
let users = new Map(); // socketId -> { username, avatar }
let typingUsers = new Set(); // Set of usernames currently typing

// Generate random avatar color
function generateAvatar(username) {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

// Get online users list
function getOnlineUsers() {
  return Array.from(users.values()).map(user => ({
    username: user.username,
    avatar: user.avatar
  }));
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (username) => {
    const avatar = generateAvatar(username);
    users.set(socket.id, { username, avatar });

    // Send message history
    if (isMongoConnected) {
      try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(100).lean();
        socket.emit('history', messages.reverse());
      } catch (err) {
        console.error('Error fetching history:', err);
        socket.emit('history', memoryMessages);
      }
    } else {
      socket.emit('history', memoryMessages);
    }

    // Broadcast user joined
    io.emit('user-joined', { username, userId: socket.id, avatar });

    // Send online users list to everyone
    io.emit('online-users', getOnlineUsers());
  });

  socket.on('message', async (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const msg = {
      username: user.username,
      text: data.text,
      timestamp: new Date(),
      avatar: user.avatar
    };

    // Save message
    if (isMongoConnected) {
      try {
        const savedMessage = await Message.create(msg);
        const messageToSend = {
          _id: savedMessage._id,
          username: savedMessage.username,
          text: savedMessage.text,
          timestamp: savedMessage.timestamp,
          avatar: savedMessage.avatar
        };
        io.emit('message', messageToSend);
      } catch (err) {
        console.error('Error saving message:', err);
        isMongoConnected = false;
        // Fallback to memory
        const messageToSend = { ...msg, _id: Date.now() };
        memoryMessages.push(messageToSend);
        if (memoryMessages.length > 100) memoryMessages.shift();
        io.emit('message', messageToSend);
      }
    } else {
      // Use memory storage
      const messageToSend = { ...msg, _id: Date.now() };
      memoryMessages.push(messageToSend);
      if (memoryMessages.length > 100) memoryMessages.shift();
      io.emit('message', messageToSend);
    }

    // Remove from typing users
    typingUsers.delete(user.username);
    io.emit('typing', Array.from(typingUsers));
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (isTyping) {
      typingUsers.add(user.username);
    } else {
      typingUsers.delete(user.username);
    }

    io.emit('typing', Array.from(typingUsers));
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      typingUsers.delete(user.username);
      io.emit('user-left', { username: user.username, userId: socket.id });
      io.emit('online-users', getOnlineUsers());
      io.emit('typing', Array.from(typingUsers));
      console.log('User disconnected:', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Allowed origins: ${allowedOrigins.join(', ')}`);
});
