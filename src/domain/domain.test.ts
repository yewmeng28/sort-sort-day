import { describe, expect, it } from 'vitest';
import {
  cellsInRect,
  extendThroughLayers,
  isMergedSelection,
  largestRect,
  mergeSelection,
  outlineEdges,
  removeCells,
  spaceLayers,
  unmergeSelection,
} from './grid';
import { categoryNames, deleteCategory, renameCategory } from './categories';
import { layoutLabel } from './label';
import { suggest } from './suggestions';
import { searchItems } from './search';
import type { Item, Space } from './types';

const space = (id: string, cells: Space['cells'], extra: Partial<Space> = {}): Space => ({
  id,
  roomId: 'r',
  name: id,
  color: '#999',
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

describe('grid', () => {
  it('builds rectangles regardless of drag direction', () => {
    expect(cellsInRect(2, 1, 0, 0, 0)).toHaveLength(6);
  });

  it('merges a selection with the spaces it touches', () => {
    const a = space('a', cellsInRect(0, 0, 0, 0, 0));
    const b = space('b', cellsInRect(2, 0, 2, 0, 0));
    const { merged, absorbedIds } = mergeSelection([a, b], cellsInRect(0, 0, 2, 0, 0), () => {
      throw new Error('should not create a new space');
    });
    expect(merged.id).toBe('a');
    expect(merged.cells).toHaveLength(3);
    expect(absorbedIds).toEqual(['b']);
  });

  it('offers unmerge only when every selected cell is in a merged space', () => {
    const merged = space('m', cellsInRect(0, 0, 1, 0, 0));
    const single = space('s', cellsInRect(3, 0, 3, 0, 0));
    expect(isMergedSelection([merged, single], cellsInRect(0, 0, 1, 0, 0))).toBe(true);
    expect(isMergedSelection([merged, single], cellsInRect(0, 0, 2, 0, 0))).toBe(false); // includes an empty cell
    expect(isMergedSelection([merged, single], cellsInRect(1, 0, 3, 0, 0))).toBe(false); // includes a single-cell space
    expect(isMergedSelection([merged], [])).toBe(false);
  });

  it('unmerges part of a space, leaving the rest in place', () => {
    const wide = space('w', cellsInRect(0, 0, 2, 0, 0), { name: 'Shelf' });
    let n = 0;
    const out = unmergeSelection([wide], cellsInRect(2, 0, 2, 0, 0), () => `new${++n}`);
    expect(out.map((s) => [s.id, s.cells.length])).toEqual([['w', 2], ['new1', 1]]);
    expect(out[1].name).toBe('Shelf 2');
  });

  it('unmerges a whole space into single cells, keeping the original id on the first', () => {
    const wide = space('w', cellsInRect(0, 0, 2, 0, 0));
    let n = 0;
    const out = unmergeSelection([wide], wide.cells, () => `new${++n}`);
    expect(out.map((s) => [s.id, s.cells.length])).toEqual([['w', 1], ['new1', 1], ['new2', 1]]);
  });

  it('removes cells and reports emptied spaces', () => {
    const a = space('a', cellsInRect(0, 0, 1, 0, 0));
    const b = space('b', cellsInRect(3, 3, 3, 3, 0));
    const { updated, emptiedIds } = removeCells([a, b], [...cellsInRect(0, 0, 0, 0, 0), ...cellsInRect(3, 3, 3, 3, 0)]);
    expect(updated.map((s) => s.id)).toEqual(['a']);
    expect(updated[0].cells).toHaveLength(1);
    expect(emptiedIds).toEqual(['b']);
  });

  it('extends a space through every layer', () => {
    const tall = extendThroughLayers(space('a', cellsInRect(1, 1, 1, 1, 0)), 3);
    expect(spaceLayers(tall)).toEqual([0, 1, 2]);
  });
});

describe('outline and labels', () => {
  it('draws only the outer boundary of merged cells', () => {
    // 2x1 block: 6 outer sides, no shared inner edge
    expect(outlineEdges(cellsInRect(0, 0, 1, 0, 0), 0)).toHaveLength(6);
    // cells on other layers are ignored
    expect(outlineEdges(cellsInRect(0, 0, 1, 0, 1), 0)).toHaveLength(0);
  });

  it('finds the largest rectangle inside an L-shape', () => {
    const l = [...cellsInRect(0, 0, 0, 2, 0), ...cellsInRect(1, 2, 2, 2, 0)];
    expect(largestRect(l, 0)).toEqual({ x: 0, y: 0, w: 1, h: 3 });
  });

  it('rotates labels in tall spaces and keeps them inside the space', () => {
    const tall = layoutLabel({ x: 0, y: 0, w: 1, h: 4 }, 'Wardrobe', 60);
    expect(tall.rotate).toBe(true);
    const wide = layoutLabel({ x: 0, y: 0, w: 1, h: 1 }, 'An extremely long cupboard name', 60);
    expect(wide.rotate).toBe(false);
    expect(wide.text.endsWith('…')).toBe(true);
    expect(wide.text.length * wide.fontSize * 0.75).toBeLessThanOrEqual(60 - 12);
  });
});

describe('categories', () => {
  it('combines saved and in-use categories, ignoring case and blanks', () => {
    const saved = [{ id: 'cables', name: 'Cables' }, { id: 'tools', name: 'Tools' }];
    const items = [item('a', 's', { category: 'cables' }), item('b', 's', { category: 'Kitchen' }), item('c', 's', { category: '  ' })];
    expect(categoryNames(saved, items)).toEqual(['Cables', 'Kitchen', 'Tools']);
  });

  const saved = [{ id: 'cables', name: 'Cables' }, { id: 'tools', name: 'Tools' }];
  const used = [item('a', 's', { category: 'cables' }), item('b', 's', { category: 'Tools' })];

  it('renames a category and the items using it', () => {
    const change = renameCategory(saved, used, 'Cables', 'Wires', 5)!;
    expect(change.saveCategories).toEqual([{ id: 'wires', name: 'Wires' }]);
    expect(change.removeCategoryIds).toEqual(['cables']);
    expect(change.items.map((i) => [i.id, i.category, i.updatedAt])).toEqual([['a', 'Wires', 5]]);
  });

  it('keeps the saved category when only the capitalisation changes', () => {
    const change = renameCategory(saved, used, 'Cables', 'CABLES', 5)!;
    expect(change.removeCategoryIds).toEqual([]);
    expect(change.saveCategories).toEqual([{ id: 'cables', name: 'CABLES' }]);
  });

  it('merges into an existing category when renaming onto it', () => {
    const change = renameCategory(saved, used, 'Cables', 'tools', 5)!;
    expect(change.saveCategories).toEqual([{ id: 'tools', name: 'Tools' }]);
    expect(change.removeCategoryIds).toEqual(['cables']);
    expect(change.items[0].category).toBe('Tools');
  });

  it('ignores blank or unchanged names', () => {
    expect(renameCategory(saved, used, 'Cables', '  ', 5)).toBeNull();
    expect(renameCategory(saved, used, 'Cables', 'Cables', 5)).toBeNull();
  });

  it('deletes a category and uncategorises its items', () => {
    const change = deleteCategory(used, 'Cables', 7);
    expect(change.removeCategoryIds).toEqual(['cables']);
    expect(change.items.map((i) => [i.id, i.category])).toEqual([['a', '']]);
  });
});

describe('suggestions', () => {
  it('gathers a scattered category into the space holding most of it', () => {
    const spaces = [space('desk', []), space('wardrobe', [])];
    const items = [
      item('c1', 'desk', { category: 'Cables' }),
      item('c2', 'desk', { category: 'cables' }),
      item('c3', 'wardrobe', { category: 'Cables' }),
    ];
    const [s] = suggest(spaces, items, 2);
    expect(s.kind).toBe('consolidate');
    expect(s.toSpaceId).toBe('desk');
    expect(s.itemIds).toEqual(['c3']);
  });

  it('moves least-used items out of an overfull space', () => {
    const spaces = [space('a', [], { capacity: 1 }), space('b', [], { capacity: 5 })];
    const items = [item('rare', 'a', { useFrequency: 1 }), item('often', 'a', { useFrequency: 3 })];
    const overfull = suggest(spaces, items, 2).find((s) => s.kind === 'overfull');
    expect(overfull?.itemIds).toEqual(['rare']);
    expect(overfull?.toSpaceId).toBe('b');
  });

  it('flags frequently used items stuck on the top layer', () => {
    const high = space('high', cellsInRect(0, 0, 0, 0, 2));
    const low = space('low', cellsInRect(1, 0, 1, 0, 0));
    const items = [item('kettle', 'high', { useFrequency: 3 })];
    const a = suggest([high, low], items, 3).find((s) => s.kind === 'accessibility');
    expect(a?.toSpaceId).toBe('low');
  });

  it('ignores missing items', () => {
    const items = [item('x', null, { status: 'missing' })];
    expect(suggest([], items, 3)).toEqual([]);
  });
});

describe('search', () => {
  it('finds items by prefix, tag and small typos', () => {
    const items = [item('1', 'a', { name: 'Scissors', tags: ['craft'] }), item('2', 'a', { name: 'Tape' })];
    expect(searchItems(items, 'sciss').map((i) => i.id)).toEqual(['1']);
    expect(searchItems(items, 'craft').map((i) => i.id)).toEqual(['1']);
    expect(searchItems(items, 'scisors').map((i) => i.id)).toEqual(['1']);
    expect(searchItems(items, '')).toEqual([]);
  });
});
