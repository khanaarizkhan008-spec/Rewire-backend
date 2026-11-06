import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { seedDatabase } from './utils/seed.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import missionRoutes from './routes/missionRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import xpRoutes from './routes/xpRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Dynamic CORS to support Flutter Web, Vite dev server, mobile apps, and custom origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow localhost on any port (for Flutter web, Vite, etc.)
    if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow configured client URL
    if (origin === ENV.CLIENT_URL) {
      return callback(null, true);
    }
    // Otherwise allow origin in development
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply General Rate Limiter to API routes
app.use('/api', generalLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV
  });
});

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/ai', aiRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Server Startup - bind to 0.0.0.0 so emulator (10.0.2.2), LAN, and localhost can all connect
const server = app.listen(ENV.PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`  REWIRE BACKEND SERVER RUNNING ON PORT ${ENV.PORT}  `);
  console.log(`  Environment: ${ENV.NODE_ENV}                       `);
  console.log(`  Client URL:  ${ENV.CLIENT_URL}                     `);
  console.log(`  AI Provider: ${ENV.AI_PROVIDER.toUpperCase()}      `);
  console.log(`=======================================================`);

  // Ensure default mission library & sample accounts exist
  try {
    await seedDatabase();
  } catch (err) {
    console.warn('Initial database auto-seed skipped or completed:', err);
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing REWIRE HTTP server...');
  server.close(() => {
    console.log('REWIRE server closed.');
    process.exit(0);
  });
});

export default app;

