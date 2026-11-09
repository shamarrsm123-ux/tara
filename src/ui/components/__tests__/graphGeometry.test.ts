import { coolingRects, linePaths, xFor, yFor, zoneBands, type GraphFrame } from '../graphGeometry';

const frame: GraphFrame = { width: 600, height: 100, startMs: 0, endMs: 600_000 };

describe('graph geometry', () => {
  test('maps time to x and Calm to y (100 at top, 0 at bottom)', () => {
    expect(xFor(300_000, frame)).toBe(300);
    expect(yFor(100, frame)).toBe(0);
    expect(yFor(0, frame)).toBe(100);
    expect(yFor(150, frame)).toBe(0); // clamped
  });

  test('zone bands follow the 07 §4.5 thresholds (Calm ≥ 50, High ≤ 30)', () => {
    const b = zoneBands(frame);
    expect(b.calm).toEqual({ y: 0, height: 50 });
    expect(b.rising).toEqual({ y: 50, height: 20 });
    expect(b.high).toEqual({ y: 70, height: 30 });
  });

  test('breaks the line at invalid seconds instead of drawing through them', () => {
    const points = [
      { tMs: 0, calm: 50 },
      { tMs: 1000, calm: 60 },
      { tMs: 2000, calm: null },
      { tMs: 3000, calm: 40 },
      { tMs: 4000, calm: 30 },
    ];
    expect(linePaths(points, frame)).toEqual(['M0 50 L1 40', 'M3 60 L4 70']);
  });

  test('ignores points outside the window and sorts by time', () => {
    const points = [
      { tMs: 2000, calm: 50 },
      { tMs: -5000, calm: 90 },
      { tMs: 1000, calm: 50 },
    ];
    expect(linePaths(points, frame)).toEqual(['M1 50 L2 50']);
  });

  test('a single valid point still draws a visible stroke', () => {
    expect(linePaths([{ tMs: 1000, calm: 50 }], frame)).toEqual(['M1 50 L1.5 50']);
  });

  test('returns no paths when every second is invalid', () => {
    expect(linePaths([{ tMs: 1000, calm: null }], frame)).toEqual([]);
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
});
