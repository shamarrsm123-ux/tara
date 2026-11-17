import { emptyMinute, flushMinute, addSecond, type SecondSample } from '../minuteAggregator';

const M = new Date(2026, 10, 16, 14, 0).getTime();
const second = (i: number, stress: number | null, isCooling = false): SecondSample => ({ tMs: M + i * 1000, stress, isCooling });

function feed(samples: readonly SecondSample[]) {
  return samples.reduce(
    (acc, s) => {
      const { state, completed } = addSecond(acc.state, s);
      return { state, done: completed === null ? acc.done : [...acc.done, completed] };
    },
    { state: emptyMinute(), done: [] as ReturnType<typeof flushMinute>[] },
  );
}

describe('minute aggregator (05 §2.4)', () => {
  test('one summary per minute: mean and max of valid seconds, zone from the mean', () => {
    const minute = Array.from({ length: 60 }, (_, i) => second(i, i < 30 ? 40 : 60));
    const { state, done } = feed([...minute, second(60, 50)]);
    expect(done).toEqual([{ tsMinute: M, stressMean: 50, stressMax: 60, validSeconds: 60, zone: 'calm', coolingOn: false }]);
    expect(flushMinute(state)).toEqual({ tsMinute: M + 60_000, stressMean: 50, stressMax: 50, validSeconds: 1, zone: 'unknown', coolingOn: false });
  });

  test('fewer than 30 valid seconds → zone unknown; invalid seconds are not averaged in', () => {
    const samples = Array.from({ length: 60 }, (_, i) => second(i, i < 29 ? 90 : null));
    expect(flushMinute(feed(samples).state)).toMatchObject({ stressMean: 90, validSeconds: 29, zone: 'unknown' });
  });

  test('cooling counts for the minute only after 30 seconds of it', () => {
    const cool = (n: number) => flushMinute(feed(Array.from({ length: 60 }, (_, i) => second(i, 75, i < n))).state);
    expect(cool(29)?.coolingOn).toBe(false);
    expect(cool(30)).toMatchObject({ coolingOn: true, zone: 'high' });
  });

  test('a minute with no valid second is not summarized (nothing to store)', () => {
    expect(flushMinute(feed(Array.from({ length: 60 }, (_, i) => second(i, null))).state)).toBeNull();
    expect(flushMinute(emptyMinute())).toBeNull();
  });
});
