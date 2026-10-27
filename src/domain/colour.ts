/** Colours offered for storage spaces, in the theme's earthy range. */
export const SPACE_COLOURS = [
  { name: 'Walnut', hex: '#8a5a2b' },
  { name: 'Moss', hex: '#5b7b4a' },
  { name: 'Slate', hex: '#4a6b8a' },
  { name: 'Brick', hex: '#8a4a4a' },
  { name: 'Plum', hex: '#7a5a8a' },
  { name: 'Mustard', hex: '#8a7a2b' },
  { name: 'Teal', hex: '#3f7a73' },
  { name: 'Sand', hex: '#c9a66b' },
] as const;

const INK = '#2a1d12';
const WHITE = '#ffffff';

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a #rrggbb colour: 0 is black, 1 is white. Unreadable input counts as mid-dark. */
export function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) return 0.2;
  const [r, g, b] = match.slice(1).map((h) => channel(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Label text and halo for a space colour: whichever of white or ink text contrasts more. */
export function labelColours(background: string): { text: string; halo: string } {
  const bg = luminance(background);
  return contrast(bg, luminance(WHITE)) >= contrast(bg, luminance(INK))
    ? { text: WHITE, halo: 'rgba(0, 0, 0, 0.5)' }
    : { text: INK, halo: 'rgba(255, 255, 255, 0.55)' };
}
