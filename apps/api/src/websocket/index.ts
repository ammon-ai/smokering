import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config.js';
import { prisma } from '../utils/db.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  cookId?: string;
}

let io: Server;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        userId: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join a cook room
    socket.on('join-cook', async (cookId: string) => {
      // Verify user owns this cook
      const cook = await prisma.cook.findFirst({
        where: {
          id: cookId,
          userId: socket.userId,
        },
      });

      if (!cook) {
        socket.emit('error', { message: 'Cook not found' });
        return;
      }

      socket.cookId = cookId;
      socket.join(`cook:${cookId}`);
      socket.emit('joined-cook', { cookId });
      console.log(`User ${socket.userId} joined cook ${cookId}`);
    });

    // Leave a cook room
    socket.on('leave-cook', () => {
      if (socket.cookId) {
        socket.leave(`cook:${socket.cookId}`);
        console.log(`User ${socket.userId} left cook ${socket.cookId}`);
        socket.cookId = undefined;
      }
    });

    // Handle temperature log (real-time update)
    socket.on('temp-logged', (data: { cookId: string; reading: unknown }) => {
      // Broadcast to all clients watching this cook (if multiple devices)
      socket.to(`cook:${data.cookId}`).emit('temp-update', data.reading);
    });

    // Handle phase update
    socket.on('phase-updated', (data: { cookId: string; phase: string }) => {
      socket.to(`cook:${data.cookId}`).emit('phase-update', data);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
}

/**
 * Emit an event to all clients watching a specific cook
 */
export function emitToCook(cookId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`cook:${cookId}`).emit(event, data);
  }
}

/**
 * Emit an event to a specific user
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    // Find all sockets for this user and emit
    io.sockets.sockets.forEach((socket: AuthenticatedSocket) => {
      if (socket.userId === userId) {
        socket.emit(event, data);
      }
    });
  }
}

export { io };
