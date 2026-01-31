import { MeatCut, SmokerType, Confidence } from '../types';

// ============================================
// Cook Time Constants
// ============================================

/**
 * Base cook times in minutes per pound at 225-250°F
 * For ribs, these are total times (not per pound)
 */
export const BASE_COOK_TIMES: Record<MeatCut, { min: number; max: number; perPound: boolean }> = {
  [MeatCut.BRISKET]: { min: 60, max: 90, perPound: true },        // 1-1.5 hrs/lb
  [MeatCut.PORK_SHOULDER]: { min: 90, max: 120, perPound: true }, // 1.5-2 hrs/lb
  [MeatCut.SPARE_RIBS]: { min: 300, max: 360, perPound: false },  // 5-6 hrs total
  [MeatCut.BABY_BACK_RIBS]: { min: 240, max: 300, perPound: false }, // 4-5 hrs total
  [MeatCut.BEEF_RIBS]: { min: 360, max: 480, perPound: false },   // 6-8 hrs total
};

/**
 * Default target internal temperatures for each cut (°F)
 */
export const DEFAULT_TARGET_TEMPS: Record<MeatCut, number> = {
  [MeatCut.BRISKET]: 203,
  [MeatCut.PORK_SHOULDER]: 205,
  [MeatCut.SPARE_RIBS]: 195,
  [MeatCut.BABY_BACK_RIBS]: 195,
  [MeatCut.BEEF_RIBS]: 203,
};

/**
 * Smoker type multipliers affect cook time
 * < 1.0 = faster, > 1.0 = slower
 */
export const SMOKER_MULTIPLIERS: Record<SmokerType, { multiplier: number; varianceMultiplier: number }> = {
  [SmokerType.PELLET]: { multiplier: 0.90, varianceMultiplier: 0.8 },    // Consistent, slightly faster
  [SmokerType.OFFSET]: { multiplier: 1.15, varianceMultiplier: 1.3 },   // Higher variance
  [SmokerType.KAMADO]: { multiplier: 0.95, varianceMultiplier: 0.85 },  // Efficient, consistent
  [SmokerType.ELECTRIC]: { multiplier: 1.0, varianceMultiplier: 1.0 },  // Baseline
  [SmokerType.KETTLE]: { multiplier: 1.10, varianceMultiplier: 1.2 },   // Less insulation
};

// ============================================
// Stall Configuration
// ============================================

export const STALL_CONFIG = {
  /** Temperature range where stall typically occurs (°F) */
  startTempF: 150,
  endTempF: 170,

  /** Duration range in minutes */
  durationMinutes: { min: 60, max: 240 },

  /** Wrapping reduces stall duration by this factor */
  wrapReductionFactor: 0.5,

  /** Cuts that experience significant stalls */
  affectedCuts: [MeatCut.BRISKET, MeatCut.PORK_SHOULDER],
};

// ============================================
// Environmental Factors
// ============================================

export const ENVIRONMENTAL_THRESHOLDS = {
  coldAmbient: 40,     // °F - below this adds cook time
  hotAmbient: 90,      // °F - above this reduces cook time
  highAltitude: 5000,  // feet - above this adds cook time
};

export const ENVIRONMENTAL_MULTIPLIERS = {
  coldAmbient: 1.12,   // +12% cook time
  hotAmbient: 0.92,    // -8% cook time
  highAltitude: 1.10,  // +10% cook time
};

// ============================================
// Phase Definitions
// ============================================

export const PHASE_NAMES = {
  PREP: 'Prep & Trim',
  PREHEAT: 'Preheat Smoker',
  SMOKE_1: 'Smoke Phase 1',
  STALL: 'Stall Window',
  WRAP_DECISION: 'Wrap Decision',
  SMOKE_2: 'Smoke Phase 2',
  REST: 'Rest',
  SERVE: 'Serve Window',
} as const;

export const PHASE_CONFIDENCE: Record<string, Confidence> = {
  [PHASE_NAMES.PREP]: Confidence.HIGH,
  [PHASE_NAMES.PREHEAT]: Confidence.HIGH,
  [PHASE_NAMES.SMOKE_1]: Confidence.MEDIUM,
  [PHASE_NAMES.STALL]: Confidence.LOW,
  [PHASE_NAMES.WRAP_DECISION]: Confidence.MEDIUM,
  [PHASE_NAMES.SMOKE_2]: Confidence.MEDIUM,
  [PHASE_NAMES.REST]: Confidence.HIGH,
  [PHASE_NAMES.SERVE]: Confidence.HIGH,
};

// ============================================
// Prep and Rest Times
// ============================================

export const PREP_TIME_MINUTES = { min: 30, max: 45 };
export const PREHEAT_TIME_MINUTES = { min: 15, max: 30 };
export const REST_TIME_MINUTES: Record<MeatCut, { min: number; max: number }> = {
  [MeatCut.BRISKET]: { min: 60, max: 120 },
  [MeatCut.PORK_SHOULDER]: { min: 45, max: 90 },
  [MeatCut.SPARE_RIBS]: { min: 10, max: 20 },
  [MeatCut.BABY_BACK_RIBS]: { min: 10, max: 15 },
  [MeatCut.BEEF_RIBS]: { min: 30, max: 60 },
};

// ============================================
// Confidence Thresholds
// ============================================

export const CONFIDENCE_THRESHOLDS = {
  high: 70,    // >= 70% confidence
  medium: 40,  // >= 40% confidence
  // < 40% = low confidence
};

// ============================================
// UI Constants
// ============================================

export const CONFIDENCE_COLORS = {
  high: '#22c55e',    // Green
  medium: '#eab308',  // Yellow
  low: '#ef4444',     // Red
};

export const MEAT_CUT_LABELS: Record<MeatCut, string> = {
  [MeatCut.BRISKET]: 'Brisket',
  [MeatCut.PORK_SHOULDER]: 'Pork Shoulder',
  [MeatCut.SPARE_RIBS]: 'Spare Ribs',
  [MeatCut.BABY_BACK_RIBS]: 'Baby Back Ribs',
  [MeatCut.BEEF_RIBS]: 'Beef Ribs',
};

export const SMOKER_TYPE_LABELS: Record<SmokerType, string> = {
  [SmokerType.PELLET]: 'Pellet',
  [SmokerType.OFFSET]: 'Offset',
  [SmokerType.KAMADO]: 'Kamado',
  [SmokerType.ELECTRIC]: 'Electric',
  [SmokerType.KETTLE]: 'Kettle',
};

// ============================================
// API Limits
// ============================================

export const API_LIMITS = {
  maxTempReadingsPerCook: 500,
  maxChatMessagesPerCook: 100,
  maxEquipmentPerUser: 10,
  defaultPageSize: 20,
  maxPageSize: 100,
};

// ============================================
// Validation Ranges
// ============================================

export const VALIDATION = {
  weight: { min: 0.5, max: 30 },           // lbs
  smokerTemp: { min: 175, max: 400 },      // °F
  internalTemp: { min: 32, max: 220 },     // °F
  ambientTemp: { min: -20, max: 120 },     // °F
  altitude: { min: 0, max: 15000 },        // feet
  humidity: { min: 0, max: 100 },          // %
};
