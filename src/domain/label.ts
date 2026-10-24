import type { Rect } from './grid';

export interface LabelLayout {
  text: string;
  /** Centre of the label in pixels. */
  cx: number;
  cy: number;
  /** Rotated -90° so it runs along the long side of a tall space. */
  rotate: boolean;
  fontSize: number;
}

const PADDING = 6;
const MIN_FONT = 8;
const MAX_FONT = 16;
/** Conservative average glyph width as a fraction of font size (the title font is wide). */
const CHAR_WIDTH = 0.75;

/** Fit a label inside a rectangle of cells: shrink the font first, then truncate, rotating for tall spaces. */
export function layoutLabel(rect: Rect, text: string, cellSize: number): LabelLayout {
  const rotate = rect.h > rect.w;
  const along = (rotate ? rect.h : rect.w) * cellSize - PADDING * 2;
  const across = (rotate ? rect.w : rect.h) * cellSize - PADDING * 2;

  let fontSize = Math.min(MAX_FONT, across, along / (text.length * CHAR_WIDTH));
  fontSize = Math.max(MIN_FONT, fontSize);

  const maxChars = Math.max(1, Math.floor(along / (fontSize * CHAR_WIDTH)));
  const fitted = text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;

  return {
    text: fitted,
    cx: (rect.x + rect.w / 2) * cellSize,
    cy: (rect.y + rect.h / 2) * cellSize,
    rotate,
    fontSize,
  };
}
