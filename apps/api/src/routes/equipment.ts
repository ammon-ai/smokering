import { Router } from 'express';
import { z } from 'zod';
import { SmokerType } from '@prisma/client';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../utils/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { API_LIMITS } from '@smokering/shared';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createEquipmentSchema = z.object({
  type: z.nativeEnum(SmokerType),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  nickname: z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
});

const updateEquipmentSchema = createEquipmentSchema.partial();

/**
 * GET /api/equipment
 * List all equipment for current user
 */
router.get('/', async (req, res, next) => {
  try {
    const equipment = await prisma.equipment.findMany({
      where: { userId: req.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/equipment/:id
 * Get single equipment by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/equipment
 * Create new equipment
 */
router.post('/', validate(createEquipmentSchema), async (req, res, next) => {
  try {
    // Check equipment limit
    const count = await prisma.equipment.count({
      where: { userId: req.userId },
    });

    if (count >= API_LIMITS.maxEquipmentPerUser) {
      throw new BadRequestError(
        `Maximum of ${API_LIMITS.maxEquipmentPerUser} smokers allowed per user`
      );
    }

    const { type, brand, model, nickname, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.equipment.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first equipment, make it default
    const shouldBeDefault = isDefault || count === 0;

    const equipment = await prisma.equipment.create({
      data: {
        userId: req.userId!,
        type,
        brand,
        model,
        nickname,
        isDefault: shouldBeDefault,
      },
    });

    res.status(201).json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/equipment/:id
 * Update equipment
 */
router.put('/:id', validate(updateEquipmentSchema), async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await prisma.equipment.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Equipment not found');
    }

    const { type, brand, model, nickname, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.equipment.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        ...(type !== undefined && { type }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(nickname !== undefined && { nickname }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/equipment/:id
 * Delete equipment
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await prisma.equipment.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Equipment not found');
    }

    await prisma.equipment.delete({
      where: { id: req.params.id },
    });

    // If deleted equipment was default, make another one default
    if (existing.isDefault) {
      const firstEquipment = await prisma.equipment.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstEquipment) {
        await prisma.equipment.update({
          where: { id: firstEquipment.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
