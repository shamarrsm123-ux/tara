// Phone notifier over Notifee (06 §2): local notifications only — no push service, no Firebase. Texts are the
// discreet lock-screen set (02 §8.13); full wording appears only inside the app.
import notifee, { AndroidForegroundServiceType, AndroidImportance, AndroidVisibility, AuthorizationStatus, RepeatFrequency, TriggerType } from '@notifee/react-native';
import type { Notifier, TextFor } from '../shared/notifierPort';
import { nextOccurrenceMs } from './schedule';

const ALERTS = 'tara-alerts';
const MONITOR = 'tara-monitor';
const MONITOR_ID = 'tara-monitoring';

async function ensureChannels(textFor: TextFor): Promise<void> {
  await notifee.createChannel({ id: ALERTS, name: 'TARA', importance: AndroidImportance.HIGH, vibration: true, visibility: AndroidVisibility.PUBLIC });
  await notifee.createChannel({ id: MONITOR, name: textFor('monitoring'), importance: AndroidImportance.LOW, vibration: false });
}

export function createNotifier(textFor: TextFor): Notifier | null {
  return {
    async requestPermission() {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    },
    async startMonitoringService() {
      await ensureChannels(textFor);
      await notifee.displayNotification({
        id: MONITOR_ID,
        title: textFor('monitoring'),
        android: {
          channelId: MONITOR,
          asForegroundService: true,
          foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE],
          ongoing: true,
          pressAction: { id: 'default' },
        },
      });
    },
    async stopMonitoringService() {
      await notifee.stopForegroundService();
    },
    async show(kind) {
      await ensureChannels(textFor);
      await notifee.displayNotification({ title: textFor(kind), android: { channelId: ALERTS, pressAction: { id: 'default' } } });
    },
    async scheduleDailyReminder(minuteOfDay) {
      await ensureChannels(textFor);
      return notifee.createTriggerNotification(
        { title: textFor('reminder'), android: { channelId: ALERTS, pressAction: { id: 'default' } } },
        { type: TriggerType.TIMESTAMP, timestamp: nextOccurrenceMs(Date.now(), minuteOfDay), repeatFrequency: RepeatFrequency.DAILY },
      );
    },
    cancel: (id) => notifee.cancelNotification(id),
    async cancelAll() {
      await notifee.cancelAllNotifications();
      await notifee.stopForegroundService();
    },
  };
}

/** Must run once at app start (index.ts): keeps the JS engine alive while the service notification is shown. */
export function registerMonitoringService(): void {
  notifee.registerForegroundService(() => new Promise<void>(() => undefined));
}
