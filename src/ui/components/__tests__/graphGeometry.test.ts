import { areaPath, barSeries, barZone, coolingRects, lineSegments, smoothPath, xFor, yFor, type GraphFrame } from '../graphGeometry';

const frame: GraphFrame = { width: 600, height: 100, startMs: 0, endMs: 600_000 };

describe('graph geometry (04a D5)', () => {
  test('maps time to x and Calm to y (100 at top, 0 at bottom)', () => {
    expect(xFor(300_000, frame)).toBe(300);
    expect(yFor(100, frame)).toBe(0);
    expect(yFor(0, frame)).toBe(100);
    expect(yFor(150, frame)).toBe(0); // clamped
  });

  test('bar color class follows the 07 §4.5 thresholds (Calm ≥ 50, High ≤ 30)', () => {
    expect([barZone(50), barZone(49), barZone(31), barZone(30)]).toEqual(['calm', 'rising', 'rising', 'high']);
  });

  test('one bar per bucket with the mean Calm of its valid seconds', () => {
    const points = [
      { tMs: 1000, calm: 40 },
      { tMs: 5000, calm: 60 },
      { tMs: 15_000, calm: 20 },
    ];
    expect(barSeries(points, frame, 60)).toEqual([
      { x: 0, width: 10, calm: 50, zone: 'calm' },
      { x: 10, width: 10, calm: 20, zone: 'high' },
    ]);
  });

  test('a bucket with samples but no valid second is a grey dot (calm null)', () => {
    expect(barSeries([{ tMs: 1000, calm: null }], frame, 60)).toEqual([{ x: 0, width: 10, calm: null, zone: null }]);
  });

  test('buckets without any sample are omitted; the last bucket includes "now"', () => {
    const bars = barSeries([{ tMs: 600_000, calm: 70 }], frame, 60);
    expect(bars).toEqual([{ x: 590, width: 10, calm: 70, zone: 'calm' }]);
  });

  test('cooling bands are clipped to the window and empty ones dropped', () => {
    expect(
      coolingRects(
        [
          { fromMs: -60_000, toMs: 60_000 },
          { fromMs: 700_000, toMs: 800_000 },
        ],
        frame,
      ),
    ).toEqual([{ x: 0, width: 60 }]);
  });

  test('line segments join neighbouring valid buckets at their centres and break at gaps (04a v2 D5)', () => {
    const points = [
      { tMs: 1000, calm: 50 },
      { tMs: 11_000, calm: 100 },
      { tMs: 21_000, calm: null },
      { tMs: 41_000, calm: 0 },
    ];
    const bars = barSeries(points, frame, 60);
    expect(lineSegments(bars, frame)).toEqual([
      [
        { x: 5, y: 50 },
        { x: 15, y: 0 },
      ],
      [{ x: 45, y: 100 }],
    ]);
  });

  test('smooth path uses flat-tangent curves that never overshoot the data', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 0, y: 10 }])).toBe('M0 10');
    expect(
      smoothPath([
        { x: 0, y: 10 },
        { x: 20, y: 30 },
      ]),
    ).toBe('M0 10 C10 10 10 30 20 30');
  });

  test('area path closes the line down to the baseline', () => {
    expect(
      areaPath(
        [
          { x: 0, y: 10 },
          { x: 20, y: 30 },
        ],
        100,
      ),
    ).toBe('M0 10 C10 10 10 30 20 30 L20 100 L0 100 Z');
    expect(areaPath([{ x: 5, y: 10 }], 100)).toBe('');
  });
});
