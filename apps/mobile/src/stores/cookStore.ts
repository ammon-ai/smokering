import { create } from 'zustand';
import { api } from '../services/api';
import {
  Cook,
  CookPlan,
  Equipment,
  TempReading,
  CookPhase,
} from '@smokering/shared';

interface CookState {
  // Current cook state
  activeCook: Cook | null;
  activePlan: CookPlan | null;
  activePhases: CookPhase[];
  recentTemps: TempReading[];

  // Equipment
  equipment: Equipment[];
  defaultEquipment: Equipment | null;

  // History
  cookHistory: Cook[];
  historyPage: number;
  hasMoreHistory: boolean;

  // Loading states
  isLoading: boolean;
  isPlanLoading: boolean;
  error: string | null;

  // Actions
  fetchEquipment: () => Promise<void>;
  createEquipment: (data: {
    type: string;
    brand?: string;
    model?: string;
    nickname?: string;
    isDefault?: boolean;
  }) => Promise<boolean>;
  updateEquipment: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  deleteEquipment: (id: string) => Promise<boolean>;
  fetchActiveCook: () => Promise<void>;
  fetchCookHistory: (page?: number) => Promise<void>;

  // Legacy aliases
  loadEquipment: () => Promise<void>;
  addEquipment: (data: {
    type: string;
    brand?: string;
    model?: string;
    nickname?: string;
    isDefault?: boolean;
  }) => Promise<boolean>;

  generatePlan: (data: {
    meatCut: string;
    weightLbs: number;
    smokerType: string;
    smokerTempF: number;
    wrapMethod?: string;
    serveTime: Date;
    ambientTempF?: number;
    altitude?: number;
  }) => Promise<CookPlan | null>;

  createCook: (data: Record<string, unknown>) => Promise<Cook | null>;
  loadActiveCook: () => Promise<void>;
  startCook: (id: string) => Promise<boolean>;
  logTemperature: (data: {
    internalTempF: number;
    smokerTempF?: number;
    probeLocation?: string;
  }) => Promise<boolean>;
  completeCook: (data: Record<string, unknown>) => Promise<boolean>;

  loadHistory: (page?: number) => Promise<void>;
  clearError: () => void;
}

export const useCookStore = create<CookState>((set, get) => ({
  activeCook: null,
  activePlan: null,
  activePhases: [],
  recentTemps: [],
  equipment: [],
  defaultEquipment: null,
  cookHistory: [],
  historyPage: 1,
  hasMoreHistory: false,
  isLoading: false,
  isPlanLoading: false,
  error: null,

  fetchEquipment: async () => {
    set({ isLoading: true });

    const response = await api.getEquipment();

    if (response.success && response.data) {
      const equipment = response.data as Equipment[];
      const defaultEquipment = equipment.find((e) => e.isDefault) || null;
      set({ equipment, defaultEquipment, isLoading: false });
    } else {
      set({ error: response.error || 'Failed to load equipment', isLoading: false });
    }
  },

  createEquipment: async (data) => {
    set({ isLoading: true, error: null });

    const response = await api.createEquipment(data);

    if (response.success) {
      await get().fetchEquipment();
      return true;
    }

    set({ error: response.error || 'Failed to add equipment', isLoading: false });
    return false;
  },

  updateEquipment: async (id: string, data: Record<string, unknown>) => {
    set({ isLoading: true, error: null });

    const response = await api.updateEquipment(id, data);

    if (response.success) {
      await get().fetchEquipment();
      return true;
    }

    set({ error: response.error || 'Failed to update equipment', isLoading: false });
    return false;
  },

  deleteEquipment: async (id: string) => {
    set({ isLoading: true, error: null });

    const response = await api.deleteEquipment(id);

    if (response.success) {
      await get().fetchEquipment();
      return true;
    }

    set({ error: response.error || 'Failed to delete equipment', isLoading: false });
    return false;
  },

  fetchActiveCook: async () => {
    set({ isLoading: true });

    const response = await api.getActiveCook();

    if (response.success) {
      const cook = response.data as Cook & { phases: CookPhase[]; tempReadings: TempReading[] } | null;
      set({
        activeCook: cook,
        activePhases: cook?.phases || [],
        recentTemps: cook?.tempReadings || [],
        isLoading: false,
      });
    } else {
      set({ error: response.error, isLoading: false });
    }
  },

  fetchCookHistory: async (page = 1) => {
    set({ isLoading: true });

    const response = await api.getCookHistory(page);

    if (response.success && response.data) {
      const { items, hasMore } = response.data as { items: Cook[]; hasMore: boolean };

      set((state) => ({
        cookHistory: page === 1 ? items : [...state.cookHistory, ...items],
        historyPage: page,
        hasMoreHistory: hasMore,
        isLoading: false,
      }));
    } else {
      set({ error: response.error, isLoading: false });
    }
  },

  // Legacy aliases
  loadEquipment: async () => {
    await get().fetchEquipment();
  },

  addEquipment: async (data) => {
    return get().createEquipment(data);
  },

  generatePlan: async (data) => {
    set({ isPlanLoading: true, error: null });

    const response = await api.planCook({
      ...data,
      serveTime: data.serveTime.toISOString(),
    });

    if (response.success && response.data) {
      const plan = response.data as CookPlan;
      set({ activePlan: plan, isPlanLoading: false });
      return plan;
    }

    set({ error: response.error || 'Failed to generate plan', isPlanLoading: false });
    return null;
  },

  createCook: async (data) => {
    set({ isLoading: true, error: null });

    const response = await api.createCook(data);

    if (response.success && response.data) {
      const { cook, plan } = response.data as { cook: Cook; plan: CookPlan };
      set({
        activeCook: cook,
        activePlan: plan,
        activePhases: (cook as unknown as { phases: CookPhase[] }).phases || [],
        isLoading: false,
      });
      return cook;
    }

    set({ error: response.error || 'Failed to create cook', isLoading: false });
    return null;
  },

  loadActiveCook: async () => {
    set({ isLoading: true });

    const response = await api.getActiveCook();

    if (response.success) {
      const cook = response.data as Cook & { phases: CookPhase[]; tempReadings: TempReading[] } | null;
      set({
        activeCook: cook,
        activePhases: cook?.phases || [],
        recentTemps: cook?.tempReadings || [],
        isLoading: false,
      });
    } else {
      set({ error: response.error, isLoading: false });
    }
  },

  startCook: async (id: string) => {
    set({ isLoading: true, error: null });

    const response = await api.startCook(id);

    if (response.success && response.data) {
      set({
        activeCook: response.data as Cook,
        isLoading: false,
      });
      return true;
    }

    set({ error: response.error || 'Failed to start cook', isLoading: false });
    return false;
  },

  logTemperature: async (data) => {
    const { activeCook, recentTemps } = get();
    if (!activeCook) return false;

    const response = await api.logTemp(activeCook.id, data);

    if (response.success && response.data) {
      const newReading = response.data as TempReading;
      set({
        recentTemps: [newReading, ...recentTemps].slice(0, 20),
      });
      return true;
    }

    return false;
  },

  completeCook: async (data) => {
    const { activeCook } = get();
    if (!activeCook) return false;

    set({ isLoading: true, error: null });

    const response = await api.completeCook(activeCook.id, data);

    if (response.success) {
      set({
        activeCook: null,
        activePlan: null,
        activePhases: [],
        recentTemps: [],
        isLoading: false,
      });
      return true;
    }

    set({ error: response.error || 'Failed to complete cook', isLoading: false });
    return false;
  },

  loadHistory: async (page = 1) => {
    set({ isLoading: true });

    const response = await api.getCookHistory(page);

    if (response.success && response.data) {
      const { items, hasMore } = response.data as { items: Cook[]; hasMore: boolean };

      set((state) => ({
        cookHistory: page === 1 ? items : [...state.cookHistory, ...items],
        historyPage: page,
        hasMoreHistory: hasMore,
        isLoading: false,
      }));
    } else {
      set({ error: response.error, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
