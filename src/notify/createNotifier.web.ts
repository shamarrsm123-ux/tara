// Web preview: browsers have no Android service or local OS notifications here (06 §2 dev tool) — none are faked.
import type { Notifier, TextFor } from '../shared/notifierPort';

export function createNotifier(_textFor: TextFor): Notifier | null {
  return null;
}

export function registerMonitoringService(): void {}
