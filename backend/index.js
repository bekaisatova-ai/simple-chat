const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Redis } = require('@upstash/redis');

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

// Redis connection
let redis = null;
let isRedisConnected = false;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    isRedisConnected = true;
    console.log('✅ Connected to Upstash Redis');
  } catch (err) {
    console.log('❌ Redis connection error:', err.message);
    console.log('⚠️  Running in memory-only mode');
    isRedisConnected = false;
  }
} else {
  console.log('⚠️  Redis credentials not found - running in memory-only mode');
}

// In-memory message storage (fallback)
let memoryMessages = [];

// Redis keys
const MESSAGES_KEY = 'chatroom:messages';
const MAX_MESSAGES = 100;

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
    if (isRedisConnected) {
      try {
        const messages = await redis.lrange(MESSAGES_KEY, 0, -1);
        const parsedMessages = [];

        // Try to parse each message individually
        for (const msg of messages) {
          try {
            // If msg is already an object, use it directly; otherwise parse it
            const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
            parsedMessages.push(parsed);
          } catch (parseErr) {
            console.error('Invalid JSON in Redis, skipping:', typeof msg === 'string' ? msg.substring(0, 50) : String(msg).substring(0, 50));
          }
        }

        // If all messages are corrupted, clear Redis
        if (parsedMessages.length === 0 && messages.length > 0) {
          console.log('🗑️  All messages corrupted, clearing Redis...');
          await redis.del(MESSAGES_KEY);
        }

        socket.emit('history', parsedMessages);
      } catch (err) {
        console.error('Error fetching history from Redis:', err);
        // Try to clear corrupted data
        try {
          await redis.del(MESSAGES_KEY);
          console.log('🗑️  Cleared corrupted Redis data');
        } catch (delErr) {
          console.error('Error clearing Redis:', delErr);
        }
        socket.emit('history', []);
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
      _id: Date.now().toString(),
      username: user.username,
      text: data.text,
      timestamp: new Date().toISOString(),
      avatar: user.avatar
    };

    // Save message
    if (isRedisConnected) {
      try {
        // Add message to Redis list
        await redis.rpush(MESSAGES_KEY, JSON.stringify(msg));

        // Trim list to keep only last MAX_MESSAGES
        const listLength = await redis.llen(MESSAGES_KEY);
        if (listLength > MAX_MESSAGES) {
          await redis.ltrim(MESSAGES_KEY, listLength - MAX_MESSAGES, -1);
        }

        io.emit('message', msg);
      } catch (err) {
        console.error('Error saving message to Redis:', err);
        isRedisConnected = false;
        // Fallback to memory
        memoryMessages.push(msg);
        if (memoryMessages.length > MAX_MESSAGES) memoryMessages.shift();
        io.emit('message', msg);
      }
    } else {
      // Use memory storage
      memoryMessages.push(msg);
      if (memoryMessages.length > MAX_MESSAGES) memoryMessages.shift();
      io.emit('message', msg);
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
