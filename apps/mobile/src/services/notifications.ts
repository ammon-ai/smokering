import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('cook-alerts', {
          name: 'Cook Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });

        await Notifications.setNotificationChannelAsync('phase-updates', {
          name: 'Phase Updates',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Schedule a notification for a cook phase
   */
  async schedulePhaseNotification(
    phaseId: string,
    title: string,
    body: string,
    triggerDate: Date
  ): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'phase', phaseId },
          sound: true,
        },
        trigger: {
          date: triggerDate,
          channelId: Platform.OS === 'android' ? 'phase-updates' : undefined,
        },
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Send an immediate notification
   */
  async sendImmediateNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'alert', ...data },
          sound: true,
        },
        trigger: null, // Immediate
      });
      return id;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return null;
    }
  }

  /**
   * Schedule phase transition reminders for a cook
   */
  async scheduleCookNotifications(
    cookId: string,
    phases: Array<{
      id: string;
      name: string;
      plannedStart: Date;
    }>
  ): Promise<void> {
    // Cancel any existing notifications for this cook
    await this.cancelCookNotifications(cookId);

    const now = new Date();

    for (const phase of phases) {
      const startTime = new Date(phase.plannedStart);

      // Don't schedule notifications for past phases
      if (startTime <= now) continue;

      // Schedule notification 5 minutes before phase starts
      const notifyTime = new Date(startTime.getTime() - 5 * 60000);
      if (notifyTime > now) {
        await this.schedulePhaseNotification(
          `${cookId}-${phase.id}`,
          `🔥 ${phase.name} Starting Soon`,
          `Get ready for the next phase of your cook`,
          notifyTime
        );
      }
    }
  }

  /**
   * Cancel all notifications for a cook
   */
  async cancelCookNotifications(cookId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduled) {
        const data = notification.content.data as { phaseId?: string };
        if (data?.phaseId?.startsWith(cookId)) {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier
          );
        }
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Temperature alert notification
   */
  async sendTempAlert(
    type: 'stall_started' | 'target_reached' | 'temp_drop',
    currentTemp: number,
    details?: string
  ): Promise<void> {
    const messages = {
      stall_started: {
        title: '⚠️ Stall Detected',
        body: `Internal temp at ${currentTemp}°F - stall may be starting. ${details || ''}`,
      },
      target_reached: {
        title: '🎉 Target Temperature Reached!',
        body: `Your meat has reached ${currentTemp}°F. Time to rest!`,
      },
      temp_drop: {
        title: '⚠️ Temperature Drop',
        body: `Internal temp dropped to ${currentTemp}°F. ${details || 'Check your smoker.'}`,
      },
    };

    const message = messages[type];
    await this.sendImmediateNotification(message.title, message.body, {
      alertType: type,
      temp: currentTemp,
    });
  }

  /**
   * Add a listener for notification responses
   */
  addResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add a listener for received notifications
   */
  addReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
