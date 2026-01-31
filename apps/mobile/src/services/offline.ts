import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Cook, TempReading } from '@smokering/shared';

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_COOK: 'offline:active_cook',
  PENDING_TEMPS: 'offline:pending_temps',
  EQUIPMENT: 'offline:equipment',
  LAST_SYNC: 'offline:last_sync',
};

interface PendingTempReading {
  cookId: string;
  data: {
    internalTempF: number;
    smokerTempF?: number;
    probeLocation?: string;
    timestamp: string;
  };
  createdAt: string;
}

class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.initNetworkListener();
  }

  /**
   * Initialize network state listener
   */
  private initNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? true;

      // Notify listeners of connectivity change
      if (wasOnline !== this.isOnline) {
        this.listeners.forEach((callback) => callback(this.isOnline));

        // If we just came back online, sync pending data
        if (this.isOnline && !wasOnline) {
          this.syncPendingData();
        }
      }
    });
  }

  /**
   * Check if device is online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to connectivity changes
   */
  onConnectivityChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Cache active cook data for offline access
   */
  async cacheActiveCook(cook: Cook): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_COOK,
        JSON.stringify(cook)
      );
    } catch (error) {
      console.error('Failed to cache active cook:', error);
    }
  }

  /**
   * Get cached active cook
   */
  async getCachedActiveCook(): Promise<Cook | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_COOK);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached cook:', error);
      return null;
    }
  }

  /**
   * Clear cached active cook
   */
  async clearCachedActiveCook(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_COOK);
    } catch (error) {
      console.error('Failed to clear cached cook:', error);
    }
  }

  /**
   * Queue a temperature reading for sync when back online
   */
  async queueTempReading(
    cookId: string,
    data: {
      internalTempF: number;
      smokerTempF?: number;
      probeLocation?: string;
    }
  ): Promise<void> {
    try {
      const existing = await this.getPendingTempReadings();
      const pendingReading: PendingTempReading = {
        cookId,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      existing.push(pendingReading);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_TEMPS,
        JSON.stringify(existing)
      );
    } catch (error) {
      console.error('Failed to queue temp reading:', error);
    }
  }

  /**
   * Get pending temperature readings
   */
  async getPendingTempReadings(): Promise<PendingTempReading[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_TEMPS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get pending temps:', error);
      return [];
    }
  }

  /**
   * Clear pending temperature readings
   */
  async clearPendingTempReadings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_TEMPS);
    } catch (error) {
      console.error('Failed to clear pending temps:', error);
    }
  }

  /**
   * Cache equipment list
   */
  async cacheEquipment(equipment: unknown[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.EQUIPMENT,
        JSON.stringify(equipment)
      );
    } catch (error) {
      console.error('Failed to cache equipment:', error);
    }
  }

  /**
   * Get cached equipment
   */
  async getCachedEquipment(): Promise<unknown[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EQUIPMENT);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached equipment:', error);
      return [];
    }
  }

  /**
   * Sync pending data when back online
   */
  async syncPendingData(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingTemps = await this.getPendingTempReadings();

      if (pendingTemps.length === 0) {
        return { synced: 0, failed: 0 };
      }

      console.log(`Syncing ${pendingTemps.length} pending temp readings...`);

      // Import api dynamically to avoid circular dependency
      const { api } = await import('./api');

      const remainingTemps: PendingTempReading[] = [];

      for (const pending of pendingTemps) {
        try {
          const response = await api.logTemp(pending.cookId, pending.data);
          if (response.success) {
            synced++;
          } else {
            // Keep for retry if it's a temporary failure
            remainingTemps.push(pending);
            failed++;
          }
        } catch {
          remainingTemps.push(pending);
          failed++;
        }
      }

      // Update pending temps with remaining items
      if (remainingTemps.length > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PENDING_TEMPS,
          JSON.stringify(remainingTemps)
        );
      } else {
        await this.clearPendingTempReadings();
      }

      // Update last sync time
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

      console.log(`Sync complete: ${synced} synced, ${failed} failed`);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    return { synced, failed };
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? new Date(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }
}

export const offlineService = new OfflineService();
