import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import fs from 'fs';

// Ensure uploads directory exists
fs.mkdirSync('uploads', { recursive: true });


// Load route files
import authRouter from './routes/auth.js';
import packagesRouter from './routes/packages.js';
import walletRouter from './routes/wallet.js';
import teamRouter from './routes/team.js';
import adminRouter from './routes/admin.js';
import newsRouter from './routes/news.js';
import epinsRouter from './routes/epins.js';
import ticketsRouter from './routes/tickets.js';
import settingsRouter from './routes/settings.js';
import kycRouter from './routes/kyc.js';
import { startSubscriptionCronJob } from './utils/cron.js';

dotenv.config();

// Initialize automated scheduled jobs
startSubscriptionCronJob();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: corsOptions
});

// Expose Socket.IO to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join user room for real-time target notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Redis setup with memory fallback
let redisClient = null;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

(async () => {
  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => {
      console.warn('Redis client error, falling back to memory storage:', err.message);
      redisClient = null;
    });
    await redisClient.connect();
    console.log('Connected to Redis Cache Server successfully.');
  } catch (err) {
    console.warn('Redis server not found or failed to connect, running with memory cache.');
    redisClient = null;
  }
})();

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/team', teamRouter);
app.use('/api/admin', adminRouter);
app.use('/api/news', newsRouter);
app.use('/api/epins', epinsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/kyc', kycRouter);
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'An unexpected error occurred on the server.' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Simply.com Backend running on port ${PORT}`);
});
