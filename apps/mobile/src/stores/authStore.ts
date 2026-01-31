import { create } from 'zustand';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const response = await api.login(email, password);

    if (response.success && response.data) {
      const { user, tokens } = response.data as { user: User; tokens: { accessToken: string; refreshToken: string } };
      await api.setTokens(tokens);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({
      error: response.error || 'Login failed',
      isLoading: false,
    });
    return false;
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const response = await api.register(email, password);

    if (response.success && response.data) {
      const { user, tokens } = response.data as { user: User; tokens: { accessToken: string; refreshToken: string } };
      await api.setTokens(tokens);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({
      error: response.error || 'Registration failed',
      isLoading: false,
    });
    return false;
  },

  logout: async () => {
    await api.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });

    const token = api.getAccessToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const response = await api.getMe();

    if (response.success && response.data) {
      set({
        user: response.data as User,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      await api.clearTokens();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
