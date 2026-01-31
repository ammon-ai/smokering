import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './utils/config.js';
import { connectDatabase, disconnectDatabase } from './utils/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeWebSocket } from './websocket/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipment.js';
import cooksRoutes from './routes/cooks.js';
import chatRoutes from './routes/chat.js';
import insightsRoutes from './routes/insights.js';

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/cooks', cooksRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/insights', insightsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down...');
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
async function start(): Promise<void> {
  try {
    await connectDatabase();

    httpServer.listen(config.PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔥 SmokeRing API Server                                 ║
║                                                           ║
║   Server:    http://localhost:${config.PORT}                     ║
║   Health:    http://localhost:${config.PORT}/health              ║
║   Mode:      ${config.NODE_ENV.padEnd(43)}║
║                                                           ║
║   AI:        ${config.ANTHROPIC_API_KEY ? 'Enabled ✓'.padEnd(44) : 'Disabled (no API key)'.padEnd(44)}║
║   WebSocket: Enabled ✓                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
