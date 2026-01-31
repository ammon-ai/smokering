import { useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useCookStore } from '../stores/cookStore';

/**
 * Hook for real-time cook synchronization
 * Connects to WebSocket and handles live updates
 */
export function useCookSync(cookId: string | undefined) {
  const { loadActiveCook } = useCookStore();

  // Handle real-time temperature updates
  const handleTempUpdate = useCallback(
    (data: unknown) => {
      const reading = data as { internalTempF: number; timestamp: string };
      // Update local state with new reading
      // In a real app, this would update the store directly
      console.log('Received temp update:', reading);
      // Refresh cook data to get latest
      loadActiveCook();
    },
    [loadActiveCook]
  );

  // Handle phase updates
  const handlePhaseUpdate = useCallback(
    (data: unknown) => {
      const { phase } = data as { phase: string };
      console.log('Phase updated:', phase);
      loadActiveCook();
    },
    [loadActiveCook]
  );

  // Handle cook completion
  const handleCookCompleted = useCallback(
    (data: unknown) => {
      console.log('Cook completed:', data);
      loadActiveCook();
    },
    [loadActiveCook]
  );

  useEffect(() => {
    if (!cookId) return;

    // Connect and join cook room
    socketService.connect();
    socketService.joinCook(cookId);

    // Subscribe to events
    const unsubTemp = socketService.on('temp-update', handleTempUpdate);
    const unsubPhase = socketService.on('phase-update', handlePhaseUpdate);
    const unsubComplete = socketService.on('cook-completed', handleCookCompleted);

    // Cleanup
    return () => {
      unsubTemp();
      unsubPhase();
      unsubComplete();
      socketService.leaveCook();
    };
  }, [cookId, handleTempUpdate, handlePhaseUpdate, handleCookCompleted]);

  // Return helper functions for emitting events
  return {
    notifyTempLogged: (reading: unknown) => {
      if (cookId) {
        socketService.notifyTempLogged(cookId, reading);
      }
    },
    notifyPhaseUpdated: (phase: string) => {
      if (cookId) {
        socketService.notifyPhaseUpdated(cookId, phase);
      }
    },
  };
}
