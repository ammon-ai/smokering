// ============================================
// Enums
// ============================================

export enum SmokerType {
  PELLET = 'PELLET',
  OFFSET = 'OFFSET',
  KAMADO = 'KAMADO',
  ELECTRIC = 'ELECTRIC',
  KETTLE = 'KETTLE',
}

export enum MeatCut {
  BRISKET = 'BRISKET',
  PORK_SHOULDER = 'PORK_SHOULDER',
  SPARE_RIBS = 'SPARE_RIBS',
  BABY_BACK_RIBS = 'BABY_BACK_RIBS',
  BEEF_RIBS = 'BEEF_RIBS',
}

export enum WrapMethod {
  NONE = 'NONE',
  BUTCHER_PAPER = 'BUTCHER_PAPER',
  FOIL = 'FOIL',
}

export enum CookOutcome {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  OKAY = 'OKAY',
  POOR = 'POOR',
}

export enum CookStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  RESTING = 'RESTING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Confidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum MeatGrade {
  SELECT = 'SELECT',
  CHOICE = 'CHOICE',
  PRIME = 'PRIME',
  WAGYU = 'WAGYU',
}

export enum Weather {
  SUNNY = 'SUNNY',
  CLOUDY = 'CLOUDY',
  RAIN = 'RAIN',
  WIND = 'WIND',
}

export enum ProbeLocation {
  POINT = 'POINT',
  FLAT = 'FLAT',
  THICKEST = 'THICKEST',
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  defaultSmokerTemp: number;
  tempUnit: 'F' | 'C';
  notifications: boolean;
}

// ============================================
// Equipment Types
// ============================================

export interface Equipment {
  id: string;
  userId: string;
  type: SmokerType;
  brand?: string;
  model?: string;
  nickname?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CreateEquipmentInput {
  type: SmokerType;
  brand?: string;
  model?: string;
  nickname?: string;
  isDefault?: boolean;
}

export interface UpdateEquipmentInput {
  type?: SmokerType;
  brand?: string;
  model?: string;
  nickname?: string;
  isDefault?: boolean;
}

// ============================================
// Cook Types
// ============================================

export interface Cook {
  id: string;
  userId: string;
  equipmentId?: string;

  // Meat details
  meatCut: MeatCut;
  weightLbs: number;
  grade?: MeatGrade;
  source?: string;

  // Cook parameters
  targetTempF: number;
  smokerTempF: number;
  wrapMethod: WrapMethod;
  wrapTempF?: number;

  // Timing
  plannedServeTime: Date;
  actualStartTime?: Date;
  actualFinishTime?: Date;
  stallStartTime?: Date;
  stallEndTime?: Date;
  restDurationMinutes?: number;

  // Conditions
  ambientTempF?: number;
  humidity?: number;
  altitude?: number;
  weather?: Weather;

  // Outcomes
  finishTempF?: number;
  outcome?: CookOutcome;
  notes?: string;

  // Prediction tracking
  predictedFinishTime?: Date;

  // Status
  status: CookStatus;
  currentPhase?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCookInput {
  equipmentId?: string;
  meatCut: MeatCut;
  weightLbs: number;
  grade?: MeatGrade;
  source?: string;
  targetTempF: number;
  smokerTempF: number;
  wrapMethod?: WrapMethod;
  wrapTempF?: number;
  plannedServeTime: Date;
  ambientTempF?: number;
  humidity?: number;
  altitude?: number;
  weather?: Weather;
}

export interface UpdateCookInput {
  status?: CookStatus;
  currentPhase?: string;
  actualStartTime?: Date;
  actualFinishTime?: Date;
  stallStartTime?: Date;
  stallEndTime?: Date;
  restDurationMinutes?: number;
  finishTempF?: number;
  outcome?: CookOutcome;
  notes?: string;
}

// ============================================
// Temperature Reading Types
// ============================================

export interface TempReading {
  id: string;
  cookId: string;
  timestamp: Date;
  internalTempF: number;
  smokerTempF?: number;
  probeLocation?: ProbeLocation;
}

export interface CreateTempReadingInput {
  internalTempF: number;
  smokerTempF?: number;
  probeLocation?: ProbeLocation;
  timestamp?: Date;
}

// ============================================
// Cook Phase Types
// ============================================

export interface CookPhase {
  id: string;
  cookId: string;
  name: string;
  plannedStart: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  confidence: Confidence;
  notes?: string;
  order: number;
}

// ============================================
// Cook Planning Types
// ============================================

export interface CookPlanInput {
  meatCut: MeatCut;
  weightLbs: number;
  smokerType: SmokerType;
  smokerTempF: number;
  wrapMethod: WrapMethod;
  serveTime: Date;
  ambientTempF?: number;
  altitude?: number;
}

export interface PhaseDefinition {
  name: string;
  startTime: Date;
  endTime: Date;
  durationRange: {
    min: number;
    max: number;
  };
  confidence: Confidence;
  notes?: string;
}

export interface CookPlan {
  phases: PhaseDefinition[];
  predictedFinishTime: Date;
  confidenceRange: {
    earliest: Date;
    latest: Date;
  };
  overallConfidence: number; // 0-100
  recommendedStartTime: Date;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  cookId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  createdAt: Date;
}

export interface ChatSource {
  title: string;
  url?: string;
  excerpt: string;
  confidence: number;
}

export interface SendMessageInput {
  cookId: string;
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
  suggestions?: string[];
}

// ============================================
// Corpus Types (for RAG)
// ============================================

export interface CorpusEntry {
  id: string;
  sourceUrl: string;
  sourceType: 'recipe' | 'forum' | 'video' | 'comment' | 'review';
  authorExpertise?: 'beginner' | 'intermediate' | 'expert' | 'competition';
  meatCut?: string;
  weightLbs?: number;
  smokerType?: string;
  reportedCookTime?: number;
  rawText: string;
  extractedAt: Date;
}

// ============================================
// Insights Types
// ============================================

export interface UserInsights {
  totalCooks: number;
  averagePredictionAccuracy: number; // in minutes
  successRate: number; // percentage of EXCELLENT or GOOD outcomes
  favoriteEquipment?: Equipment;
  mostCookedCut: MeatCut;
  cooksByMonth: { month: string; count: number }[];
  equipmentPerformance: {
    equipmentId: string;
    nickname?: string;
    avgAccuracy: number;
    cookCount: number;
  }[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Auth Types
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
