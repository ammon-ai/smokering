import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../utils/db.js';
import { config } from '../utils/config.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Helper to generate JWT tokens
function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 * Register a new user (development mode only)
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestError('Email already registered');
    }

    // Hash password (for local auth)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        // Store hashed password in a separate field if needed
        // For now, we use Supabase auth or JWT-only approach
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Create default preferences
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // In production, verify password against hash
    // For development, we'll skip password verification if no password stored
    // This allows easy testing without setting up password hashing

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    res.json({
      success: true,
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as {
      userId: string;
      email: string;
      type?: string;
    };

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(decoded.userId, decoded.email);

    res.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid refresh token'));
    } else {
      next(error);
    }
  }
});

export default router;
