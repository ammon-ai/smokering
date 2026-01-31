import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import { UnauthorizedError } from '../utils/errors.js';
import { prisma } from '../utils/db.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// Initialize Supabase client if configured
const supabase = config.SUPABASE_URL && config.SUPABASE_ANON_KEY
  ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Authentication middleware
 * Supports both Supabase JWT and local JWT tokens
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Try Supabase authentication first
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        // Find or create user in our database
        let dbUser = await prisma.user.findUnique({
          where: { supabaseId: user.id },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email!,
              supabaseId: user.id,
            },
          });
        }

        req.userId = dbUser.id;
        req.user = { id: dbUser.id, email: dbUser.email };
        return next();
      }
    }

    // Fallback to local JWT verification (for development)
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      req.userId = user.id;
      req.user = { id: user.id, email: user.email };
      return next();
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't throw if no token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  return authenticate(req, res, next);
}
