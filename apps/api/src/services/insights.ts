import { prisma } from '../utils/db.js';
import { UserInsights, MeatCut, Equipment } from '@smokering/shared';

/**
 * Calculate user insights and statistics
 */
export async function getUserInsights(userId: string): Promise<UserInsights> {
  // Get all completed cooks for the user
  const completedCooks = await prisma.cook.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    include: {
      equipment: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate total cooks
  const totalCooks = completedCooks.length;

  if (totalCooks === 0) {
    // Return empty insights for new users
    const equipment = await prisma.equipment.findMany({
      where: { userId },
    });

    return {
      totalCooks: 0,
      averagePredictionAccuracy: 0,
      successRate: 0,
      favoriteEquipment: equipment.find((e) => e.isDefault) as Equipment | undefined,
      mostCookedCut: MeatCut.BRISKET, // Default
      cooksByMonth: [],
      equipmentPerformance: [],
    };
  }

  // Calculate prediction accuracy (in minutes)
  const cooksWithPrediction = completedCooks.filter(
    (c) => c.predictedFinishTime && c.actualFinishTime
  );

  let averagePredictionAccuracy = 0;
  if (cooksWithPrediction.length > 0) {
    const totalAccuracy = cooksWithPrediction.reduce((sum, cook) => {
      const predicted = new Date(cook.predictedFinishTime!).getTime();
      const actual = new Date(cook.actualFinishTime!).getTime();
      return sum + Math.abs(actual - predicted) / 60000; // Convert to minutes
    }, 0);
    averagePredictionAccuracy = Math.round(totalAccuracy / cooksWithPrediction.length);
  }

  // Calculate success rate (EXCELLENT or GOOD outcomes)
  const successfulCooks = completedCooks.filter(
    (c) => c.outcome === 'EXCELLENT' || c.outcome === 'GOOD'
  );
  const successRate = Math.round((successfulCooks.length / totalCooks) * 100);

  // Find most used equipment
  const equipmentUsage: Record<string, number> = {};
  completedCooks.forEach((cook) => {
    if (cook.equipmentId) {
      equipmentUsage[cook.equipmentId] = (equipmentUsage[cook.equipmentId] || 0) + 1;
    }
  });

  const favoriteEquipmentId = Object.entries(equipmentUsage).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  const favoriteEquipment = favoriteEquipmentId
    ? (completedCooks.find((c) => c.equipmentId === favoriteEquipmentId)
        ?.equipment as Equipment | undefined)
    : undefined;

  // Find most cooked cut
  const cutCounts: Record<string, number> = {};
  completedCooks.forEach((cook) => {
    cutCounts[cook.meatCut] = (cutCounts[cook.meatCut] || 0) + 1;
  });

  const mostCookedCut = Object.entries(cutCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] as MeatCut || MeatCut.BRISKET;

  // Calculate cooks by month (last 12 months)
  const cooksByMonth: { month: string; count: number }[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    const monthLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });

    const count = completedCooks.filter((cook) => {
      const cookDate = new Date(cook.createdAt);
      return (
        cookDate.getFullYear() === date.getFullYear() &&
        cookDate.getMonth() === date.getMonth()
      );
    }).length;

    cooksByMonth.push({ month: monthLabel, count });
  }

  // Calculate equipment performance
  const equipmentStats: Record<
    string,
    { accuracies: number[]; cookCount: number; nickname?: string }
  > = {};

  completedCooks.forEach((cook) => {
    if (!cook.equipmentId || !cook.equipment) return;

    if (!equipmentStats[cook.equipmentId]) {
      equipmentStats[cook.equipmentId] = {
        accuracies: [],
        cookCount: 0,
        nickname: cook.equipment.nickname || undefined,
      };
    }

    equipmentStats[cook.equipmentId].cookCount++;

    if (cook.predictedFinishTime && cook.actualFinishTime) {
      const predicted = new Date(cook.predictedFinishTime).getTime();
      const actual = new Date(cook.actualFinishTime).getTime();
      equipmentStats[cook.equipmentId].accuracies.push(
        Math.abs(actual - predicted) / 60000
      );
    }
  });

  const equipmentPerformance = Object.entries(equipmentStats).map(
    ([equipmentId, stats]) => ({
      equipmentId,
      nickname: stats.nickname,
      avgAccuracy:
        stats.accuracies.length > 0
          ? Math.round(
              stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length
            )
          : 0,
      cookCount: stats.cookCount,
    })
  );

  return {
    totalCooks,
    averagePredictionAccuracy,
    successRate,
    favoriteEquipment,
    mostCookedCut,
    cooksByMonth,
    equipmentPerformance,
  };
}

/**
 * Get equipment-specific insights
 */
export async function getEquipmentInsights(
  userId: string,
  equipmentId: string
): Promise<{
  totalCooks: number;
  averageAccuracy: number;
  bestCut: MeatCut | null;
  temperatureTendency: number; // Positive = runs hot, negative = runs cold
}> {
  const cooks = await prisma.cook.findMany({
    where: {
      userId,
      equipmentId,
      status: 'COMPLETED',
    },
    include: {
      tempReadings: true,
    },
  });

  if (cooks.length === 0) {
    return {
      totalCooks: 0,
      averageAccuracy: 0,
      bestCut: null,
      temperatureTendency: 0,
    };
  }

  // Calculate accuracy
  const cooksWithPrediction = cooks.filter(
    (c) => c.predictedFinishTime && c.actualFinishTime
  );

  let averageAccuracy = 0;
  if (cooksWithPrediction.length > 0) {
    const totalAccuracy = cooksWithPrediction.reduce((sum, cook) => {
      const predicted = new Date(cook.predictedFinishTime!).getTime();
      const actual = new Date(cook.actualFinishTime!).getTime();
      return sum + Math.abs(actual - predicted) / 60000;
    }, 0);
    averageAccuracy = Math.round(totalAccuracy / cooksWithPrediction.length);
  }

  // Find best performing cut
  const cutPerformance: Record<string, { excellent: number; total: number }> = {};
  cooks.forEach((cook) => {
    if (!cutPerformance[cook.meatCut]) {
      cutPerformance[cook.meatCut] = { excellent: 0, total: 0 };
    }
    cutPerformance[cook.meatCut].total++;
    if (cook.outcome === 'EXCELLENT') {
      cutPerformance[cook.meatCut].excellent++;
    }
  });

  const bestCutEntry = Object.entries(cutPerformance)
    .filter(([, stats]) => stats.total >= 2) // Need at least 2 cooks
    .sort(([, a], [, b]) => b.excellent / b.total - a.excellent / a.total)[0];

  const bestCut = bestCutEntry ? (bestCutEntry[0] as MeatCut) : null;

  // Calculate temperature tendency
  // Compare actual smoker temps vs target temps
  let tempDifferences: number[] = [];
  cooks.forEach((cook) => {
    cook.tempReadings.forEach((reading) => {
      if (reading.smokerTempF) {
        tempDifferences.push(reading.smokerTempF - cook.smokerTempF);
      }
    });
  });

  const temperatureTendency =
    tempDifferences.length > 0
      ? Math.round(
          tempDifferences.reduce((a, b) => a + b, 0) / tempDifferences.length
        )
      : 0;

  return {
    totalCooks: cooks.length,
    averageAccuracy,
    bestCut,
    temperatureTendency,
  };
}
