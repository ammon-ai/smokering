import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Token storage keys
const TOKEN_KEY = 'auth_tokens';

class ApiClient {
  private tokens: AuthTokens | null = null;

  constructor() {
    this.loadTokens();
  }

  private async loadTokens(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  }

  async clearTokens(): Promise<void> {
    this.tokens = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Add auth token if available
    if (this.tokens?.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle token refresh on 401
      if (response.status === 401 && this.tokens?.refreshToken) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request
          (headers as Record<string, string>)['Authorization'] = `Bearer ${this.tokens.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return retryResponse.json();
        }
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.tokens?.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.tokens) {
          await this.setTokens(data.data.tokens);
          return true;
        }
      }

      // Refresh failed, clear tokens
      await this.clearTokens();
      return false;
    } catch {
      await this.clearTokens();
      return false;
    }
  }

  // Auth endpoints
  async register(email: string, password: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Equipment endpoints
  async getEquipment() {
    return this.request('/api/equipment');
  }

  async createEquipment(data: {
    type: string;
    brand?: string;
    model?: string;
    nickname?: string;
    isDefault?: boolean;
  }) {
    return this.request('/api/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEquipment(id: string, data: Record<string, unknown>) {
    return this.request(`/api/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEquipment(id: string) {
    return this.request(`/api/equipment/${id}`, { method: 'DELETE' });
  }

  // Cook endpoints
  async planCook(data: {
    meatCut: string;
    weightLbs: number;
    smokerType: string;
    smokerTempF: number;
    wrapMethod?: string;
    serveTime: string;
    ambientTempF?: number;
    altitude?: number;
  }) {
    return this.request('/api/cooks/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCook(data: Record<string, unknown>) {
    return this.request('/api/cooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActiveCook() {
    return this.request('/api/cooks/active');
  }

  async getCookHistory(page = 1, pageSize = 20, status?: string) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(status && { status }),
    });
    return this.request(`/api/cooks/history?${params}`);
  }

  async getCook(id: string) {
    return this.request(`/api/cooks/${id}`);
  }

  async updateCook(id: string, data: Record<string, unknown>) {
    return this.request(`/api/cooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async startCook(id: string) {
    return this.request(`/api/cooks/${id}/start`, { method: 'POST' });
  }

  async completeCook(id: string, data: Record<string, unknown>) {
    return this.request(`/api/cooks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logTemp(cookId: string, data: {
    internalTempF: number;
    smokerTempF?: number;
    probeLocation?: string;
    timestamp?: string;
  }) {
    return this.request(`/api/cooks/${cookId}/temp`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Chat endpoints
  async sendChatMessage(cookId: string, content: string) {
    return this.request(`/api/chat/${cookId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getChatHistory(cookId: string) {
    return this.request(`/api/chat/${cookId}`);
  }

  // Insights endpoints
  async getInsights() {
    return this.request('/api/insights/user');
  }

  async getEquipmentInsights(equipmentId: string) {
    return this.request(`/api/insights/equipment/${equipmentId}`);
  }

  async getAccuracyData() {
    return this.request('/api/insights/accuracy');
  }
}

export const api = new ApiClient();
