import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../utils/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { generatePitAssistResponse } from '../ai/agents/pitAssist.js';
import { API_LIMITS, Cook } from '@smokering/shared';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * POST /api/chat/:cookId/message
 * Send a message to the AI Pit Assist
 */
router.post('/:cookId/message', validate(sendMessageSchema), async (req, res, next) => {
  try {
    const { cookId } = req.params;
    const { content } = req.body;

    // Find cook and verify ownership
    const cook = await prisma.cook.findFirst({
      where: {
        id: cookId,
        userId: req.userId,
      },
      include: {
        equipment: true,
        tempReadings: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    // Check message limit
    const messageCount = await prisma.chatMessage.count({
      where: { cookId },
    });

    if (messageCount >= API_LIMITS.maxChatMessagesPerCook) {
      throw new BadRequestError('Maximum chat messages reached for this cook');
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        cookId,
        role: 'user',
        content,
      },
    });

    // Calculate elapsed time
    const startTime = cook.actualStartTime || cook.createdAt;
    const elapsedMinutes = Math.round(
      (Date.now() - new Date(startTime).getTime()) / 60000
    );

    // Build conversation history
    const conversationHistory = cook.chatMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Generate AI response
    const aiResult = await generatePitAssistResponse(
      content,
      {
        cook: cook as unknown as Cook,
        recentTemps: cook.tempReadings.map((r) => ({
          timestamp: r.timestamp,
          internalTempF: r.internalTempF,
          smokerTempF: r.smokerTempF || undefined,
        })),
        elapsedMinutes,
      },
      conversationHistory
    );

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        cookId,
        role: 'assistant',
        content: aiResult.content,
        sources: aiResult.sources.length > 0 ? aiResult.sources : undefined,
      },
    });

    res.json({
      success: true,
      data: {
        userMessage,
        assistantMessage: {
          ...assistantMessage,
          suggestions: aiResult.suggestions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/:cookId
 * Get chat history for a cook
 */
router.get('/:cookId', async (req, res, next) => {
  try {
    const { cookId } = req.params;

    // Verify cook ownership
    const cook = await prisma.cook.findFirst({
      where: {
        id: cookId,
        userId: req.userId,
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    const messages = await prisma.chatMessage.findMany({
      where: { cookId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/chat/:cookId
 * Clear chat history for a cook
 */
router.delete('/:cookId', async (req, res, next) => {
  try {
    const { cookId } = req.params;

    // Verify cook ownership
    const cook = await prisma.cook.findFirst({
      where: {
        id: cookId,
        userId: req.userId,
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    await prisma.chatMessage.deleteMany({
      where: { cookId },
    });

    res.json({
      success: true,
      data: { cleared: true },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
