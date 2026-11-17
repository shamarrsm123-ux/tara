// 13 Phase 9 acceptance at the logic level: a 2 PM pattern is offered from a week of history; once accepted, cutting
// the history to 1 day (retention → 1) fades it, cancels its reminder and says "I need more days".
import { planReminders, reminderMinuteFor, type StoredPattern } from '../plan';

const NOW = new Date(2026, 10, 17, 20, 0).getTime();
const at = (daysAgo: number, h: number, m = 0) => new Date(2026, 10, 17 - daysAgo, h, m).getTime();

function week(days: number[]) {
  const minutes = days.flatMap((d) =>
    Array.from({ length: 150 }, (_, i) => ({ tsMinute: at(d, 9) + i * 60_000, stressMean: 40, stressMax: 50, validSeconds: 60, zone: 'calm' as const, coolingOn: false })),
  );
  const events = days.filter((d) => d !== 3 && d !== 6).map((d) => ({ ts: at(d, 14, 5), type: 'high_episode_start' as const }));
  return { minutes, events };
}

describe('reminder plan (03 Flows 4 & 8, 11 §6)', () => {
  test('a week with stress around 2 PM most days → a 14:00 pattern is offered; reminder at 13:30', () => {
    const { minutes, events } = week([0, 1, 2, 3, 4, 5, 6]);
    const plan = planReminders([], minutes, events, NOW);
    expect(plan.needMoreDays).toBe(false);
    expect(plan.patterns).toEqual([expect.objectContaining({ slotStartMin: 840, status: 'offered', reminderNotificationId: null })]);
    expect(reminderMinuteFor(840)).toBe(810);
  });

  test('retention cut to 1 day: the accepted pattern fades, its reminder is cancelled, "I need more days"', () => {
    const accepted: StoredPattern = { slotStartMin: 840, matchingDays: 5, detectedAt: NOW, status: 'accepted', declinedUntil: null, reminderNotificationId: 'r-1' };
    const { minutes, events } = week([0]);
    const plan = planReminders([accepted], minutes, events, NOW);
    expect(plan.needMoreDays).toBe(true);
    expect(plan.cancelIds).toEqual(['r-1']);
    expect(plan.fadedSlots).toEqual([840]);
    expect(plan.patterns[0]).toMatchObject({ status: 'faded', reminderNotificationId: null });
  });

  test('a declined pattern is not offered again for 7 days', () => {
    const declined: StoredPattern = { slotStartMin: 840, matchingDays: 5, detectedAt: NOW, status: 'declined', declinedUntil: NOW + 86_400_000, reminderNotificationId: null };
    const { minutes, events } = week([0, 1, 2, 3, 4, 5, 6]);
    expect(planReminders([declined], minutes, events, NOW).patterns).toEqual([expect.objectContaining({ status: 'declined' })]);
  });
});
