import * as C from '../constants';

// 07 §9 is the source of truth. A tuning change updates 07, then this test (13 Phase 15).
describe('engine constants match 07 §9', () => {
  test('fit, signal and zone constants', () => {
    expect([C.FIT_GOOD, C.FIT_ADJUST]).toEqual([70, 40]);
    expect([C.EMA_TAU_S, C.BASELINE_SECONDS, C.S_MIN_SPREAD]).toEqual([10, 60, 0.05]);
    expect([C.STRESS_OFFSET, C.STRESS_GAIN]).toEqual([30, 20]);
    expect([C.ZONE_CALM_MAX_S, C.ZONE_HIGH_MIN_S, C.ZONE_VERY_HIGH_MIN_S]).toEqual([50, 70, 85]);
  });

  test('episode, prompt and cooling constants', () => {
    expect(C.SUSTAIN_S).toEqual({ fewer: 90, normal: 60, more: 45 });
    expect([C.VALID_FRACTION, C.HIGH_END_S, C.HIGH_END_HOLD_S]).toEqual([0.8, 55, 60]);
    expect([C.PROMPT_COOLDOWN_MIN, C.POST_COOLING_QUIET_MIN, C.NO_COUNT_ASK, C.AUTO_COOL_MIN_GAP_MIN]).toEqual([15, 10, 3, 30]);
    expect([C.COOL_MAX_CONTINUOUS_MIN, C.COOL_REST_MIN]).toEqual([20, 5]);
    expect([C.HELP_SUSTAIN_MIN, C.HELP_COOLDOWN_MIN]).toEqual([10, 60]);
  });

  test('pattern, battery and retention constants', () => {
    expect([C.PATTERN_MIN_USABLE_DAYS, C.PATTERN_MIN_MATCH_DAYS, C.PATTERN_FADE_BELOW]).toEqual([4, 3, 2]);
    expect([C.REMINDER_LEAD_MIN, C.PATTERN_DECLINE_DAYS]).toEqual([30, 7]);
    expect([C.BATT_LOW, C.BATT_LOCK, C.BATT_OFF, C.PHONE_BATT_LOW]).toEqual([20, 10, 3, 15]);
    expect(C.RETENTION_MAX_DAYS).toBe(7);
  });

  test('derived Calm thresholds match 02 §5 zones (Calm ≥ 50, High ≤ 30)', () => {
    expect(C.CALM_ZONE_MIN_C).toBe(50);
    expect(C.HIGH_ZONE_MAX_C).toBe(30);
  });
});
