import { describe, expect, it } from 'vitest';
import { labelColours, luminance, SPACE_COLOURS } from './colour';
import { cellsInRect } from './grid';
import { frequencyLabel, fullnessText } from './items';
import { layoutLabel } from './label';
import { deleteSpaceChanges, dragCells, fullness, NO_SELECTION, tapCell } from './spaces';
import type { Item, Space } from './types';

const space = (id: string, cells: Space['cells'], extra: Partial<Space> = {}): Space => ({
  id,
  roomId: 'r',
  name: id,
  color: '#999999',
  cells,
  ...extra,
});

const item = (id: string, spaceId: string | null, extra: Partial<Item> = {}): Item => ({
  id,
  roomId: 'r',
  spaceId,
  name: id,
  qty: 1,
  category: '',
  tags: [],
  useFrequency: 2,
  status: 'stored',
  updatedAt: 0,
  ...extra,
});

describe('label colours', () => {
  it('measures luminance from black to white', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1);
    expect(luminance('not a colour')).toBe(0.2);
  });

  it('uses white text on dark colours and ink on light ones', () => {
    expect(labelColours('#3f7a73').text).toBe('#ffffff');
    expect(labelColours('#c9a66b').text).toBe('#2a1d12');
    expect(labelColours('#f6ecd2').text).toBe('#2a1d12');
  });

  it('keeps at least 3:1 contrast for every palette colour', () => {
    const ratio = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    for (const { hex } of SPACE_COLOURS) expect(ratio(hex, labelColours(hex).text)).toBeGreaterThanOrEqual(3);
  });
});

describe('labels', () => {
  it('keeps a comfortable single line on one line', () => {
    const label = layoutLabel({ x: 0, y: 0, w: 3, h: 1 }, 'Under-bed boxes', 58);
    expect(label.lines).toEqual(['Under-bed boxes']);
    expect(label.fontSize).toBeGreaterThanOrEqual(13);
  });

  it('splits a name that would otherwise be small, without shortening it', () => {
    const label = layoutLabel({ x: 0, y: 0, w: 1, h: 2 }, 'Chest of drawers', 58);
    expect(label.rotate).toBe(true);
    expect(label.lines).toEqual(['Chest of', 'drawers']);
    expect(label.fontSize).toBe(15);
  });

  it('wraps onto two lines when that allows a bigger font', () => {
    const label = layoutLabel({ x: 0, y: 0, w: 2, h: 2 }, 'Mum’s old sewing box', 58);
    expect(label.lines).toEqual(['Mum’s old', 'sewing box']);
  });

  it('shortens with an ellipsis only when the smallest font still does not fit', () => {
    const label = layoutLabel({ x: 0, y: 0, w: 1, h: 1 }, 'Extraordinarilylongcupboardname', 58);
    expect(label.lines).toHaveLength(1);
    expect(label.lines[0].endsWith('…')).toBe(true);
    expect(label.lines[0].length * label.fontSize * 0.6).toBeLessThanOrEqual(58 - 10);
  });

  it('keeps the top band clear for a badge and stays inside the space', () => {
    const label = layoutLabel({ x: 2, y: 1, w: 3, h: 1 }, 'Under-bed boxes', 58, 18);
    expect(label.cx).toBe(3.5 * 58);
    expect(label.cy).toBe(1.5 * 58 + 9);
    expect(label.lines.length * label.lineHeight).toBeLessThanOrEqual(58 - 10 - 18);
  });
});

describe('fullness', () => {
  it('counts stored items against the capacity', () => {
    const drawers = space('d', [], { capacity: 2 });
    const items = [item('a', 'd'), item('b', 'd'), item('c', 'd'), item('lost', 'd', { status: 'missing' })];
    expect(fullness(drawers, items)).toEqual({ count: 3, capacity: 2, overfull: true });
    expect(fullness(space('e', []), items)).toEqual({ count: 0, capacity: undefined, overfull: false });
  });
});

describe('item text', () => {
  it('describes fullness with and without a limit', () => {
    expect(fullnessText(5, 4)).toBe('5 of 4 · overfull');
    expect(fullnessText(3, 6)).toBe('3 of 6');
    expect(fullnessText(1, undefined)).toBe('1 item');
    expect(fullnessText(0, undefined)).toBe('0 items');
  });

  it('names how often an item is used', () => {
    expect([1, 2, 3].map((f) => frequencyLabel(f as 1 | 2 | 3))).toEqual(['Rarely', 'Sometimes', 'Often']);
  });
});

describe('deleting a space', () => {
  it('removes the space and leaves its items without a home', () => {
    const shelf = space('shelf', cellsInRect(0, 0, 1, 0, 0));
    const change = deleteSpaceChanges(shelf, [item('a', 'shelf'), item('b', 'other')], 7);
    expect(change.removeSpaceIds).toEqual(['shelf']);
    expect(change.items).toEqual([{ ...item('a', 'shelf'), spaceId: null, updatedAt: 7 }]);
  });
});

describe('edit selection', () => {
  const wardrobe = space('wardrobe', cellsInRect(0, 0, 1, 1, 0));
  const spaces = [wardrobe];
  const at = (x: number, y: number) => ({ x, y, layer: 0 });

  it('selects a whole space with one tap, and deselects it with another', () => {
    const picked = tapCell(NO_SELECTION, spaces, at(1, 1));
    expect(picked).toEqual({ spaceId: 'wardrobe', cells: [] });
    expect(tapCell(picked, spaces, at(0, 0))).toEqual(NO_SELECTION);
  });

  it('starts a cell selection from an empty cell, then toggles any cell', () => {
    const one = tapCell(NO_SELECTION, spaces, at(3, 3));
    expect(one).toEqual({ spaceId: null, cells: [at(3, 3)] });
    const withSpaceCell = tapCell(one, spaces, at(1, 1));
    expect(withSpaceCell.cells).toEqual([at(3, 3), at(1, 1)]);
    expect(tapCell(withSpaceCell, spaces, at(3, 3)).cells).toEqual([at(1, 1)]);
  });

  it('switches from a selected space to a fresh cell selection on an empty tap', () => {
    const picked = tapCell(NO_SELECTION, spaces, at(0, 0));
    expect(tapCell(picked, spaces, at(4, 4))).toEqual({ spaceId: null, cells: [at(4, 4)] });
  });

  it('adds every cell a drag covers, without duplicates', () => {
    const start = tapCell(NO_SELECTION, spaces, at(2, 0));
    const dragged = dragCells(start, at(2, 0), at(3, 1));
    expect(dragged.spaceId).toBeNull();
    expect(dragged.cells).toHaveLength(4);
  });
});
