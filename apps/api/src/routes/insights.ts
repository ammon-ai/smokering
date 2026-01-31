import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUserInsights, getEquipmentInsights } from '../services/insights.js';
import { NotFoundError } from '../utils/errors.js';
import { prisma } from '../utils/db.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/insights/user
 * Get user's overall cooking insights
 */
router.get('/user', async (req, res, next) => {
  try {
    const insights = await getUserInsights(req.userId!);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/insights/equipment/:id
 * Get insights for specific equipment
 */
router.get('/equipment/:id', async (req, res, next) => {
  try {
    // Verify equipment ownership
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    const insights = await getEquipmentInsights(req.userId!, req.params.id);

    res.json({
      success: true,
      data: {
        equipment,
        insights,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/insights/accuracy
 * Get prediction accuracy over time
 */
router.get('/accuracy', async (req, res, next) => {
  try {
    const cooks = await prisma.cook.findMany({
      where: {
        userId: req.userId,
        status: 'COMPLETED',
        predictedFinishTime: { not: null },
        actualFinishTime: { not: null },
      },
      select: {
        id: true,
        meatCut: true,
        predictedFinishTime: true,
        actualFinishTime: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 50, // Last 50 cooks with predictions
    });

    const accuracyData = cooks.map((cook) => {
      const predicted = new Date(cook.predictedFinishTime!).getTime();
      const actual = new Date(cook.actualFinishTime!).getTime();
      const accuracyMinutes = Math.round((actual - predicted) / 60000);

      return {
        id: cook.id,
        meatCut: cook.meatCut,
        date: cook.createdAt,
        accuracyMinutes, // Negative = finished early, positive = finished late
        absoluteAccuracy: Math.abs(accuracyMinutes),
      };
    });

    // Calculate rolling average
    const rollingWindow = 5;
    const rollingAverages = accuracyData.map((_, index, arr) => {
      if (index < rollingWindow - 1) return null;

      const window = arr.slice(index - rollingWindow + 1, index + 1);
      const avg =
        window.reduce((sum, d) => sum + d.absoluteAccuracy, 0) / rollingWindow;
      return Math.round(avg);
    });

    res.json({
      success: true,
      data: {
        cooks: accuracyData,
        rollingAverages,
        overallAverage:
          accuracyData.length > 0
            ? Math.round(
                accuracyData.reduce((sum, d) => sum + d.absoluteAccuracy, 0) /
                  accuracyData.length
              )
            : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
