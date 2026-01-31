import { Router } from 'express';
import { z } from 'zod';
import { MeatCut, WrapMethod, CookStatus, CookOutcome, SmokerType } from '@prisma/client';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../utils/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { generateCookPlan } from '../services/cookPlanner.js';
import { API_LIMITS, DEFAULT_TARGET_TEMPS } from '@smokering/shared';
import { MeatCut as SharedMeatCut, SmokerType as SharedSmokerType, WrapMethod as SharedWrapMethod } from '@smokering/shared';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createCookSchema = z.object({
  equipmentId: z.string().optional(),
  meatCut: z.nativeEnum(MeatCut),
  weightLbs: z.number().min(0.5).max(30),
  grade: z.string().optional(),
  source: z.string().optional(),
  targetTempF: z.number().min(150).max(220).optional(),
  smokerTempF: z.number().min(175).max(400),
  wrapMethod: z.nativeEnum(WrapMethod).optional(),
  wrapTempF: z.number().min(140).max(180).optional(),
  plannedServeTime: z.string().datetime(),
  ambientTempF: z.number().min(-20).max(120).optional(),
  humidity: z.number().min(0).max(100).optional(),
  altitude: z.number().min(0).max(15000).optional(),
  weather: z.string().optional(),
});

const planCookSchema = z.object({
  meatCut: z.nativeEnum(MeatCut),
  weightLbs: z.number().min(0.5).max(30),
  smokerType: z.nativeEnum(SmokerType),
  smokerTempF: z.number().min(175).max(400),
  wrapMethod: z.nativeEnum(WrapMethod).optional(),
  serveTime: z.string().datetime(),
  ambientTempF: z.number().min(-20).max(120).optional(),
  altitude: z.number().min(0).max(15000).optional(),
});

const updateCookSchema = z.object({
  status: z.nativeEnum(CookStatus).optional(),
  currentPhase: z.string().optional(),
  actualStartTime: z.string().datetime().optional(),
  actualFinishTime: z.string().datetime().optional(),
  stallStartTime: z.string().datetime().optional(),
  stallEndTime: z.string().datetime().optional(),
  restDurationMinutes: z.number().min(0).optional(),
  finishTempF: z.number().min(150).max(220).optional(),
  outcome: z.nativeEnum(CookOutcome).optional(),
  notes: z.string().max(2000).optional(),
});

const logTempSchema = z.object({
  internalTempF: z.number().min(32).max(220),
  smokerTempF: z.number().min(100).max(500).optional(),
  probeLocation: z.enum(['POINT', 'FLAT', 'THICKEST']).optional(),
  timestamp: z.string().datetime().optional(),
});

const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  pageSize: z.string().optional().default('20').transform(Number),
  status: z.nativeEnum(CookStatus).optional(),
});

/**
 * POST /api/cooks/plan
 * Generate a cook plan without creating a cook record
 */
router.post('/plan', validate(planCookSchema), async (req, res, next) => {
  try {
    const { meatCut, weightLbs, smokerType, smokerTempF, wrapMethod, serveTime, ambientTempF, altitude } = req.body;

    const plan = generateCookPlan({
      meatCut: meatCut as SharedMeatCut,
      weightLbs,
      smokerType: smokerType as SharedSmokerType,
      smokerTempF,
      wrapMethod: (wrapMethod || 'NONE') as SharedWrapMethod,
      serveTime: new Date(serveTime),
      ambientTempF,
      altitude,
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cooks
 * Create a new cook
 */
router.post('/', validate(createCookSchema), async (req, res, next) => {
  try {
    const {
      equipmentId,
      meatCut,
      weightLbs,
      grade,
      source,
      targetTempF,
      smokerTempF,
      wrapMethod,
      wrapTempF,
      plannedServeTime,
      ambientTempF,
      humidity,
      altitude,
      weather,
    } = req.body;

    // Verify equipment ownership if provided
    let equipment = null;
    if (equipmentId) {
      equipment = await prisma.equipment.findFirst({
        where: { id: equipmentId, userId: req.userId },
      });
      if (!equipment) {
        throw new NotFoundError('Equipment not found');
      }
    } else {
      // Use default equipment
      equipment = await prisma.equipment.findFirst({
        where: { userId: req.userId, isDefault: true },
      });
    }

    // Get default target temp if not provided
    const finalTargetTemp = targetTempF || DEFAULT_TARGET_TEMPS[meatCut as SharedMeatCut];

    // Generate cook plan for prediction
    const plan = equipment
      ? generateCookPlan({
          meatCut: meatCut as SharedMeatCut,
          weightLbs,
          smokerType: equipment.type as SharedSmokerType,
          smokerTempF,
          wrapMethod: (wrapMethod || 'NONE') as SharedWrapMethod,
          serveTime: new Date(plannedServeTime),
          ambientTempF,
          altitude,
        })
      : null;

    // Create cook with phases
    const cook = await prisma.cook.create({
      data: {
        userId: req.userId!,
        equipmentId: equipment?.id,
        meatCut,
        weightLbs,
        grade,
        source,
        targetTempF: finalTargetTemp,
        smokerTempF,
        wrapMethod: wrapMethod || 'NONE',
        wrapTempF,
        plannedServeTime: new Date(plannedServeTime),
        ambientTempF,
        humidity,
        altitude,
        weather,
        predictedFinishTime: plan?.predictedFinishTime,
        phases: plan
          ? {
              create: plan.phases.map((phase, index) => ({
                name: phase.name,
                plannedStart: phase.startTime,
                plannedEnd: phase.endTime,
                confidence: phase.confidence,
                notes: phase.notes,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        equipment: true,
        phases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        cook,
        plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cooks/active
 * Get the user's active cook (if any)
 */
router.get('/active', async (req, res, next) => {
  try {
    const cook = await prisma.cook.findFirst({
      where: {
        userId: req.userId,
        status: { in: ['PLANNED', 'ACTIVE', 'RESTING'] },
      },
      include: {
        equipment: true,
        phases: { orderBy: { order: 'asc' } },
        tempReadings: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: cook,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cooks/history
 * Get cook history with pagination
 */
router.get('/history', validate(paginationSchema, 'query'), async (req, res, next) => {
  try {
    let { page, pageSize, status } = req.query as { page: number; pageSize: number; status?: CookStatus };

    pageSize = Math.min(pageSize, API_LIMITS.maxPageSize);

    const where = {
      userId: req.userId,
      ...(status && { status }),
    };

    const [cooks, total] = await Promise.all([
      prisma.cook.findMany({
        where,
        include: {
          equipment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cook.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: cooks,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cooks/:id
 * Get a single cook with all details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const cook = await prisma.cook.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        equipment: true,
        phases: { orderBy: { order: 'asc' } },
        tempReadings: { orderBy: { timestamp: 'asc' } },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    res.json({
      success: true,
      data: cook,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/cooks/:id
 * Update a cook
 */
router.put('/:id', validate(updateCookSchema), async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await prisma.cook.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Cook not found');
    }

    const updateData: Record<string, unknown> = {};

    // Process each field
    const fields = [
      'status',
      'currentPhase',
      'restDurationMinutes',
      'finishTempF',
      'outcome',
      'notes',
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle datetime fields
    const dateFields = [
      'actualStartTime',
      'actualFinishTime',
      'stallStartTime',
      'stallEndTime',
    ];

    for (const field of dateFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = new Date(req.body[field]);
      }
    }

    const cook = await prisma.cook.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        equipment: true,
        phases: { orderBy: { order: 'asc' } },
      },
    });

    res.json({
      success: true,
      data: cook,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cooks/:id/start
 * Start a cook
 */
router.post('/:id/start', async (req, res, next) => {
  try {
    const cook = await prisma.cook.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    if (cook.status !== 'PLANNED') {
      throw new BadRequestError('Cook has already been started');
    }

    const updated = await prisma.cook.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        actualStartTime: new Date(),
      },
      include: {
        equipment: true,
        phases: { orderBy: { order: 'asc' } },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cooks/:id/complete
 * Complete a cook
 */
router.post('/:id/complete', validate(updateCookSchema), async (req, res, next) => {
  try {
    const cook = await prisma.cook.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    if (cook.status === 'COMPLETED' || cook.status === 'CANCELLED') {
      throw new BadRequestError('Cook has already been completed or cancelled');
    }

    const { finishTempF, outcome, notes, restDurationMinutes } = req.body;

    const updated = await prisma.cook.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        actualFinishTime: new Date(),
        finishTempF,
        outcome,
        notes,
        restDurationMinutes,
      },
      include: {
        equipment: true,
        phases: { orderBy: { order: 'asc' } },
        tempReadings: { orderBy: { timestamp: 'asc' } },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/cooks/:id/temp
 * Log a temperature reading
 */
router.put('/:id/temp', validate(logTempSchema), async (req, res, next) => {
  try {
    const cook = await prisma.cook.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        _count: { select: { tempReadings: true } },
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    if (cook.status !== 'ACTIVE' && cook.status !== 'RESTING') {
      throw new BadRequestError('Can only log temps for active or resting cooks');
    }

    if (cook._count.tempReadings >= API_LIMITS.maxTempReadingsPerCook) {
      throw new BadRequestError('Maximum temperature readings reached');
    }

    const { internalTempF, smokerTempF, probeLocation, timestamp } = req.body;

    const reading = await prisma.tempReading.create({
      data: {
        cookId: cook.id,
        internalTempF,
        smokerTempF,
        probeLocation,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    res.json({
      success: true,
      data: reading,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cooks/:id
 * Delete a cook (only if not completed)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const cook = await prisma.cook.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!cook) {
      throw new NotFoundError('Cook not found');
    }

    if (cook.status === 'COMPLETED') {
      throw new BadRequestError('Cannot delete completed cooks');
    }

    await prisma.cook.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
