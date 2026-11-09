// "Bad 2 PM week" (03 Flow 18): seven days of in-memory history so pattern detection can find a real
// 2 PM pattern. Generated on demand, returned as plain arrays, never persisted (11 §8.2).
import type { EventRow, MinuteRow } from '../patterns/detect';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const WORK_START_MIN = 8 * 60;
const WORK_MINUTES = 8 * 60;
const HISTORY_DAYS = 7;

/** Episode start (minute of day) for each past day, oldest first; null = no 2 PM episode that day. */
const EPISODES: readonly (number | null)[] = [14 * 60 + 5, 13 * 60 + 52, null, 14 * 60 + 20, 14 * 60 + 10, null, 13 * 60 + 58];

export interface DemoHistory {
  minutes: MinuteRow[];
  events: EventRow[];
}

export function badTwoPmWeekHistory(todayLocal: Date): DemoHistory {
  const today = Date.UTC(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => today - (HISTORY_DAYS - i) * DAY);

  const minutes = days.flatMap((dayStart) =>
    Array.from({ length: WORK_MINUTES }, (_, i): MinuteRow => {
      const minuteOfDay = WORK_START_MIN + i;
      const isAfternoon = minuteOfDay >= 13 * 60 + 45 && minuteOfDay < 14 * 60 + 40;
      return {
        tsMinute: dayStart + minuteOfDay * MIN,
        stressMean: isAfternoon ? 78 : 35,
        stressMax: isAfternoon ? 88 : 48,
        validSeconds: 60,
        zone: isAfternoon ? 'high' : 'calm',
        coolingOn: false,
      };
    }),
  );

  const events = days.flatMap((dayStart, i): EventRow[] => {
    const at = EPISODES[i];
    return at === null || at === undefined ? [] : [{ ts: dayStart + at * MIN, type: 'high_episode_start' }];
  });

  return { minutes, events };
}
