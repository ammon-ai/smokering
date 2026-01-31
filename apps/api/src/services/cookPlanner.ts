import {
  MeatCut,
  SmokerType,
  WrapMethod,
  Confidence,
  CookPlan,
  CookPlanInput,
  PhaseDefinition,
  BASE_COOK_TIMES,
  SMOKER_MULTIPLIERS,
  STALL_CONFIG,
  ENVIRONMENTAL_THRESHOLDS,
  ENVIRONMENTAL_MULTIPLIERS,
  PHASE_NAMES,
  PHASE_CONFIDENCE,
  PREP_TIME_MINUTES,
  PREHEAT_TIME_MINUTES,
  REST_TIME_MINUTES,
  CONFIDENCE_THRESHOLDS,
} from '@smokering/shared';

/**
 * Calculate environmental multiplier based on ambient temp and altitude
 */
function getEnvironmentalMultiplier(
  ambientTempF?: number,
  altitude?: number
): number {
  let multiplier = 1.0;

  if (ambientTempF !== undefined) {
    if (ambientTempF < ENVIRONMENTAL_THRESHOLDS.coldAmbient) {
      multiplier *= ENVIRONMENTAL_MULTIPLIERS.coldAmbient;
    } else if (ambientTempF > ENVIRONMENTAL_THRESHOLDS.hotAmbient) {
      multiplier *= ENVIRONMENTAL_MULTIPLIERS.hotAmbient;
    }
  }

  if (altitude !== undefined && altitude > ENVIRONMENTAL_THRESHOLDS.highAltitude) {
    multiplier *= ENVIRONMENTAL_MULTIPLIERS.highAltitude;
  }

  return multiplier;
}

/**
 * Check if a meat cut experiences a significant stall
 */
function hasStall(meatCut: MeatCut): boolean {
  return STALL_CONFIG.affectedCuts.includes(meatCut);
}

/**
 * Calculate base cook time in minutes
 */
function calculateBaseCookTime(
  meatCut: MeatCut,
  weightLbs: number,
  smokerType: SmokerType,
  wrapMethod: WrapMethod,
  ambientTempF?: number,
  altitude?: number
): { min: number; max: number } {
  const baseTime = BASE_COOK_TIMES[meatCut];
  const smokerFactor = SMOKER_MULTIPLIERS[smokerType];
  const envMultiplier = getEnvironmentalMultiplier(ambientTempF, altitude);

  let minTime: number;
  let maxTime: number;

  if (baseTime.perPound) {
    minTime = baseTime.min * weightLbs;
    maxTime = baseTime.max * weightLbs;
  } else {
    minTime = baseTime.min;
    maxTime = baseTime.max;
  }

  // Apply smoker multiplier
  minTime *= smokerFactor.multiplier;
  maxTime *= smokerFactor.multiplier;

  // Apply variance multiplier
  const variance = maxTime - minTime;
  const adjustedVariance = variance * smokerFactor.varianceMultiplier;
  const midpoint = (minTime + maxTime) / 2;
  minTime = midpoint - adjustedVariance / 2;
  maxTime = midpoint + adjustedVariance / 2;

  // Apply environmental multiplier
  minTime *= envMultiplier;
  maxTime *= envMultiplier;

  return { min: Math.round(minTime), max: Math.round(maxTime) };
}

/**
 * Calculate stall duration
 */
function calculateStallDuration(
  meatCut: MeatCut,
  wrapMethod: WrapMethod
): { min: number; max: number } | null {
  if (!hasStall(meatCut)) {
    return null;
  }

  let { min, max } = STALL_CONFIG.durationMinutes;

  // Wrapping reduces stall duration
  if (wrapMethod !== WrapMethod.NONE) {
    min *= STALL_CONFIG.wrapReductionFactor;
    max *= STALL_CONFIG.wrapReductionFactor;
  }

  return { min: Math.round(min), max: Math.round(max) };
}

/**
 * Calculate overall confidence score (0-100)
 */
function calculateOverallConfidence(
  phases: PhaseDefinition[],
  smokerType: SmokerType
): number {
  // Base confidence from smoker type variance
  const smokerFactor = SMOKER_MULTIPLIERS[smokerType];
  let baseConfidence = 100 - (smokerFactor.varianceMultiplier - 1) * 50;

  // Reduce confidence for each low-confidence phase
  const lowConfidenceCount = phases.filter(
    (p) => p.confidence === Confidence.LOW
  ).length;
  baseConfidence -= lowConfidenceCount * 10;

  // Reduce confidence for each medium-confidence phase
  const mediumConfidenceCount = phases.filter(
    (p) => p.confidence === Confidence.MEDIUM
  ).length;
  baseConfidence -= mediumConfidenceCount * 5;

  return Math.max(20, Math.min(100, Math.round(baseConfidence)));
}

/**
 * Generate a complete cook plan with phases and timing
 */
export function generateCookPlan(input: CookPlanInput): CookPlan {
  const {
    meatCut,
    weightLbs,
    smokerType,
    smokerTempF,
    wrapMethod,
    serveTime,
    ambientTempF,
    altitude,
  } = input;

  const phases: PhaseDefinition[] = [];
  const serveDate = new Date(serveTime);

  // Calculate total cook time
  const cookTimeRange = calculateBaseCookTime(
    meatCut,
    weightLbs,
    smokerType,
    wrapMethod,
    ambientTempF,
    altitude
  );

  // Calculate stall duration if applicable
  const stallDuration = calculateStallDuration(meatCut, wrapMethod);

  // Get rest time
  const restTime = REST_TIME_MINUTES[meatCut];

  // Work backwards from serve time
  let currentTime = new Date(serveDate);

  // Phase: Serve Window (±30 minutes)
  const serveWindowStart = new Date(currentTime.getTime() - 30 * 60000);
  const serveWindowEnd = new Date(currentTime.getTime() + 30 * 60000);

  // Phase: Rest
  const restEnd = serveWindowStart;
  const restStart = new Date(restEnd.getTime() - restTime.max * 60000);

  phases.unshift({
    name: PHASE_NAMES.REST,
    startTime: restStart,
    endTime: restEnd,
    durationRange: restTime,
    confidence: PHASE_CONFIDENCE[PHASE_NAMES.REST],
    notes: `Rest for ${restTime.min}-${restTime.max} minutes minimum`,
  });

  // Calculate when cooking should end (this is our target finish time)
  const predictedFinishTime = restStart;

  // Phase: Smoke Phase 2 (post-wrap or continued smoke)
  const hasPrimaryStall = hasStall(meatCut);
  const smoke2End = restStart;

  let smoke2Duration: { min: number; max: number };
  let smoke1Duration: { min: number; max: number };

  if (hasPrimaryStall && stallDuration) {
    // Split cook time around stall
    // Smoke 1 gets us to stall temp (~150-160°F), roughly 40% of cook
    // Stall takes variable time
    // Smoke 2 finishes the cook, roughly 30% of total
    smoke1Duration = {
      min: Math.round(cookTimeRange.min * 0.4),
      max: Math.round(cookTimeRange.max * 0.4),
    };
    smoke2Duration = {
      min: Math.round(cookTimeRange.min * 0.3),
      max: Math.round(cookTimeRange.max * 0.3),
    };
  } else {
    // For cuts without significant stall, single smoke phase
    smoke1Duration = cookTimeRange;
    smoke2Duration = { min: 0, max: 0 };
  }

  if (smoke2Duration.min > 0) {
    const smoke2Start = new Date(
      smoke2End.getTime() - smoke2Duration.max * 60000
    );

    phases.unshift({
      name: PHASE_NAMES.SMOKE_2,
      startTime: smoke2Start,
      endTime: smoke2End,
      durationRange: smoke2Duration,
      confidence: PHASE_CONFIDENCE[PHASE_NAMES.SMOKE_2],
      notes:
        wrapMethod !== WrapMethod.NONE
          ? `Wrapped in ${wrapMethod.toLowerCase().replace('_', ' ')}`
          : 'Unwrapped cook continues',
    });

    // Phase: Wrap Decision (if wrapping)
    if (wrapMethod !== WrapMethod.NONE) {
      phases.unshift({
        name: PHASE_NAMES.WRAP_DECISION,
        startTime: smoke2Start,
        endTime: smoke2Start,
        durationRange: { min: 0, max: 0 },
        confidence: PHASE_CONFIDENCE[PHASE_NAMES.WRAP_DECISION],
        notes: `Wrap when internal temp reaches ${STALL_CONFIG.startTempF}-${STALL_CONFIG.endTempF}°F`,
      });
    }

    // Phase: Stall Window
    if (stallDuration) {
      const stallEnd = smoke2Start;
      const stallStart = new Date(
        stallEnd.getTime() - stallDuration.max * 60000
      );

      phases.unshift({
        name: PHASE_NAMES.STALL,
        startTime: stallStart,
        endTime: stallEnd,
        durationRange: stallDuration,
        confidence: PHASE_CONFIDENCE[PHASE_NAMES.STALL],
        notes: `⚠️ High variance - internal temp plateaus at ${STALL_CONFIG.startTempF}-${STALL_CONFIG.endTempF}°F`,
      });
    }
  }

  // Phase: Smoke Phase 1
  const smoke1End = phases[0]?.startTime || smoke2End;
  const smoke1Start = new Date(smoke1End.getTime() - smoke1Duration.max * 60000);

  phases.unshift({
    name: PHASE_NAMES.SMOKE_1,
    startTime: smoke1Start,
    endTime: smoke1End,
    durationRange: smoke1Duration,
    confidence: PHASE_CONFIDENCE[PHASE_NAMES.SMOKE_1],
    notes: `Smoke at ${smokerTempF}°F`,
  });

  // Phase: Preheat Smoker
  const preheatEnd = smoke1Start;
  const preheatStart = new Date(
    preheatEnd.getTime() - PREHEAT_TIME_MINUTES.max * 60000
  );

  phases.unshift({
    name: PHASE_NAMES.PREHEAT,
    startTime: preheatStart,
    endTime: preheatEnd,
    durationRange: PREHEAT_TIME_MINUTES,
    confidence: PHASE_CONFIDENCE[PHASE_NAMES.PREHEAT],
    notes: `Preheat smoker to ${smokerTempF}°F`,
  });

  // Phase: Prep & Trim
  const prepEnd = preheatStart;
  const prepStart = new Date(prepEnd.getTime() - PREP_TIME_MINUTES.max * 60000);

  phases.unshift({
    name: PHASE_NAMES.PREP,
    startTime: prepStart,
    endTime: prepEnd,
    durationRange: PREP_TIME_MINUTES,
    confidence: PHASE_CONFIDENCE[PHASE_NAMES.PREP],
    notes: 'Trim fat, apply rub, bring to room temperature',
  });

  // Calculate confidence range for finish time
  const totalVarianceMinutes =
    (cookTimeRange.max - cookTimeRange.min) +
    (stallDuration ? stallDuration.max - stallDuration.min : 0);

  const confidenceRange = {
    earliest: new Date(
      predictedFinishTime.getTime() - totalVarianceMinutes * 30000
    ), // Half variance early
    latest: new Date(
      predictedFinishTime.getTime() + totalVarianceMinutes * 30000
    ), // Half variance late
  };

  // Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(phases, smokerType);

  // Assign order to phases
  phases.forEach((phase, index) => {
    (phase as PhaseDefinition & { order: number }).order = index;
  });

  return {
    phases,
    predictedFinishTime,
    confidenceRange,
    overallConfidence,
    recommendedStartTime: prepStart,
  };
}

/**
 * Update prediction based on actual temperature readings
 */
export function updatePrediction(
  originalPlan: CookPlan,
  currentTempF: number,
  elapsedMinutes: number,
  targetTempF: number
): {
  updatedFinishTime: Date;
  adjustedConfidence: number;
  status: 'ahead' | 'on_track' | 'behind';
} {
  // Calculate expected progress based on linear interpolation (simplified)
  // In reality, smoking is non-linear due to stall
  const totalExpectedMinutes =
    (originalPlan.confidenceRange.latest.getTime() -
      originalPlan.recommendedStartTime.getTime()) /
    60000;

  const expectedProgress = elapsedMinutes / totalExpectedMinutes;
  const actualProgress = currentTempF / targetTempF;

  // Determine if ahead, behind, or on track
  let status: 'ahead' | 'on_track' | 'behind';
  let timeAdjustment: number;

  if (actualProgress > expectedProgress * 1.1) {
    status = 'ahead';
    timeAdjustment = -Math.round((actualProgress - expectedProgress) * totalExpectedMinutes * 0.3);
  } else if (actualProgress < expectedProgress * 0.9) {
    status = 'behind';
    timeAdjustment = Math.round((expectedProgress - actualProgress) * totalExpectedMinutes * 0.3);
  } else {
    status = 'on_track';
    timeAdjustment = 0;
  }

  const updatedFinishTime = new Date(
    originalPlan.predictedFinishTime.getTime() + timeAdjustment * 60000
  );

  // Adjust confidence based on actual vs expected
  const deviationFactor = Math.abs(actualProgress - expectedProgress);
  const adjustedConfidence = Math.max(
    20,
    originalPlan.overallConfidence - deviationFactor * 30
  );

  return {
    updatedFinishTime,
    adjustedConfidence: Math.round(adjustedConfidence),
    status,
  };
}

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(score: number): Confidence {
  if (score >= CONFIDENCE_THRESHOLDS.high) {
    return Confidence.HIGH;
  }
  if (score >= CONFIDENCE_THRESHOLDS.medium) {
    return Confidence.MEDIUM;
  }
  return Confidence.LOW;
}
