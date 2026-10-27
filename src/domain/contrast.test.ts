import { describe, expect, it } from 'vitest';
import { luminance } from './colour';

/** Theme tokens from src/index.css; keep in sync when the palette changes. */
const T = {
  leather: '#3b2a1c',
  leatherLight: '#5a4230',
  parchment: '#e9d9b4',
  parchmentRaised: '#f6ecd2',
  ink: '#2a1d12',
  inkMuted: '#6a5640',
  onDark: '#e9d9b4',
  onDarkMuted: '#c9b48c',
  gold: '#d9a521',
  goldText: '#7d5a0f',
  danger: '#a33a26',
  white: '#ffffff',
};

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// WCAG AA: 4.5:1 for normal text.
const TEXT_PAIRS: [string, string, string][] = [
  ['body text on parchment', T.ink, T.parchment],
  ['muted text on parchment', T.inkMuted, T.parchment],
  ['muted text on raised parchment', T.inkMuted, T.parchmentRaised],
  ['main button label', T.onDark, T.leatherLight],
  ['tab labels', T.onDarkMuted, T.leatherLight],
  ['active tab', T.gold, T.leather],
  ['room name in the top bar', T.onDark, T.leather],
  ['red actions on parchment', T.danger, T.parchment],
  ['red actions on raised parchment', T.danger, T.parchmentRaised],
  ['white on red badges', T.white, T.danger],
  ['gold text on raised parchment', T.goldText, T.parchmentRaised],
];

describe('theme contrast', () => {
  it.each(TEXT_PAIRS)('%s meets 4.5:1', (_name, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
