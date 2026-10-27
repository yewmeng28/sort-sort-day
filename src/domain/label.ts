import type { Rect } from './grid';

export interface LabelLayout {
  /** One or two lines, already shortened with "…" if they still don't fit. */
  lines: string[];
  /** Centre of the label in pixels. */
  cx: number;
  cy: number;
  /** Rotated -90° so it runs along the long side of a tall space. */
  rotate: boolean;
  fontSize: number;
  lineHeight: number;
}

const PADDING = 5;
const MIN_FONT = 10;
const MAX_FONT = 15;
/** A single line this big reads fine, so don't split it. */
const COMFORTABLE_FONT = 13;
/** Average glyph width of the semibold system font, as a fraction of font size. */
const CHAR_WIDTH = 0.6;
const LINE_HEIGHT = 1.2;

/** Split at the word break that makes the two lines most even, or null for a single word. */
function splitInTwo(text: string): [string, string] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best: [string, string] | null = null;
  for (let i = 1; i < words.length; i++) {
    const pair: [string, string] = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    if (!best || Math.max(pair[0].length, pair[1].length) < Math.max(best[0].length, best[1].length)) best = pair;
  }
  return best;
}

const shorten = (line: string, maxChars: number) =>
  line.length > maxChars ? `${line.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…` : line;

/**
 * Fit a space's name inside a rectangle of cells (sizes in pixels). Tries one line and two lines and keeps whichever
 * allows the larger font, then shortens with "…" only if the minimum font still doesn't fit. Tall spaces rotate the
 * label to run along their length. `insetTop` keeps a band clear at the top, e.g. for a count badge.
 */
export function layoutLabel(rect: Rect, text: string, cellSize: number, insetTop = 0): LabelLayout {
  const rotate = rect.h > rect.w;
  const along = (rotate ? rect.h : rect.w) * cellSize - PADDING * 2;
  const across = (rotate ? rect.w : rect.h) * cellSize - PADDING * 2 - (rotate ? 0 : insetTop);

  const fit = (lines: string[]) => {
    const longest = Math.max(...lines.map((l) => l.length));
    return Math.min(MAX_FONT, across / (lines.length * LINE_HEIGHT), along / (longest * CHAR_WIDTH));
  };

  let best = { lines: [text], size: fit([text]) };
  const two = best.size < COMFORTABLE_FONT ? splitInTwo(text) : null;
  if (two) {
    const size = fit(two);
    if (size > best.size) best = { lines: two, size };
  }

  const fontSize = Math.max(MIN_FONT, best.size);
  const maxChars = Math.max(1, Math.floor(along / (fontSize * CHAR_WIDTH)));
  const maxLines = Math.max(1, Math.floor(across / (fontSize * LINE_HEIGHT)));
  const lines = best.lines.length <= maxLines ? best.lines.map((l) => shorten(l, maxChars)) : [shorten(text, maxChars)];

  return {
    lines,
    cx: (rect.x + rect.w / 2) * cellSize,
    cy: (rect.y + rect.h / 2) * cellSize + (rotate ? 0 : insetTop / 2),
    rotate,
    fontSize,
    lineHeight: fontSize * LINE_HEIGHT,
  };
}
