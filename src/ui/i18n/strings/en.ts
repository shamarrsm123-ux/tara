// English source strings. Copy follows 02/03 verbatim where they give it, and the 04 §12 copy rules.
// Every key must exist in ar_EG and am_ET (enforced by the `Strings` type and by tests, 12 §2.4).
export const en = {
  zone: {
    calm: 'Calm',
    rising: 'Rising',
    high: 'High stress',
  },
  meter: {
    percent: '%',
    notConnected: 'Not connected',
    adjustSensor: 'Adjust sensor',
    a11y: 'Calm {{value}} percent, {{zone}}',
  },
  fit: {
    good: 'Good',
    adjust: 'Adjust',
    none: 'No contact',
  },
  demo: {
    ribbon: 'DEMO — not real brain data',
    corner: 'DEMO',
    spedUp: 'Demo — sped up',
  },
  prompt: {
    highStress: 'Your stress is high. Should we cool around your head now?',
    yesCool: 'Yes — Cool',
    no: 'No',
  },
  cool: {
    start: 'Cool Around My Head',
    stop: 'Stop Cooling',
  },
  common: {
    playVoice: 'Play voice',
  },
  deleteAll: {
    button: 'Delete Everything',
    hold: 'Hold for {{seconds}} seconds',
  },
  graph: {
    a11y: 'Calm over the last {{minutes}} minutes',
  },
};

export type Strings = typeof en;
