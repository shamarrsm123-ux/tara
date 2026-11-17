import { nextOccurrenceMs } from '../schedule';

describe('daily reminder time (03 Flow 8)', () => {
  test('later today when still ahead, else tomorrow, in local time', () => {
    const noon = new Date(2026, 10, 17, 12, 0).getTime();
    expect(new Date(nextOccurrenceMs(noon, 13 * 60 + 30))).toEqual(new Date(2026, 10, 17, 13, 30));
    expect(new Date(nextOccurrenceMs(noon, 9 * 60))).toEqual(new Date(2026, 10, 18, 9, 0));
    expect(() => nextOccurrenceMs(noon, 1440)).toThrow();
  });
});
