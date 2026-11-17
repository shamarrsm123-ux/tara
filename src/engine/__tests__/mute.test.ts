import { muteUntilMono } from '../mute';

describe('mute choices (03 Flow 7 step 5)', () => {
  const now = new Date(2026, 10, 17, 22, 30).getTime();
  test('30 min, 1 hour, and until local midnight — on the monotonic clock', () => {
    expect(muteUntilMono('m30', now, 5_000)).toBe(5_000 + 30 * 60_000);
    expect(muteUntilMono('h1', now, 5_000)).toBe(5_000 + 60 * 60_000);
    expect(muteUntilMono('day', now, 5_000)).toBe(5_000 + 90 * 60_000);
  });
});
