// Pure scheduling math for daily reminders (03 Flow 8): the next local time at `minuteOfDay`.
const MS_PER_MIN = 60_000;
const MIN_PER_DAY = 1440;

export function nextOccurrenceMs(nowMs: number, minuteOfDay: number): number {
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= MIN_PER_DAY) throw new RangeError('minuteOfDay');
  const d = new Date(nowMs);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() + minuteOfDay * MS_PER_MIN;
  return today > nowMs ? today : new Date(new Date(today).setDate(new Date(today).getDate() + 1)).getTime();
}
