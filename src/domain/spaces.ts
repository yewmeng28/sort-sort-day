import { cellKey, cellsInRect, spaceAtCell } from './grid';
import type { Cell, Item, Space } from './types';

/** How full a space is. Capacity counts kinds of item (item records), not their quantities. */
export function fullness(space: Space, items: Item[]) {
  const count = items.filter((i) => i.spaceId === space.id && i.status === 'stored').length;
  return { count, capacity: space.capacity, overfull: space.capacity !== undefined && count > space.capacity };
}

/** Deleting a space removes it from every layer; its items stay, without a home, so they show up in the Den. */
export function deleteSpaceChanges(space: Space, items: Item[], now: number) {
  return {
    removeSpaceIds: [space.id],
    items: items.filter((i) => i.spaceId === space.id).map((i) => ({ ...i, spaceId: null, updatedAt: now })),
  };
}

/**
 * What's selected while editing the map: either one whole space, or a set of cells on the current layer.
 * Rules: with nothing or a space selected, tapping a space selects it (tap it again to deselect) and tapping an empty
 * cell starts a cell selection. Once cells are selected, every tap toggles a cell, so spaces can be added to a merge.
 * Dragging always selects the cells it covers.
 */
export interface EditSelection {
  spaceId: string | null;
  cells: Cell[];
}

export const NO_SELECTION: EditSelection = { spaceId: null, cells: [] };

export function tapCell(selection: EditSelection, spaces: Space[], cell: Cell): EditSelection {
  if (selection.cells.length) {
    const key = cellKey(cell);
    const has = selection.cells.some((c) => cellKey(c) === key);
    const cells = has ? selection.cells.filter((c) => cellKey(c) !== key) : [...selection.cells, cell];
    return { spaceId: null, cells };
  }
  const owner = spaceAtCell(spaces, cell);
  if (owner) return owner.id === selection.spaceId ? NO_SELECTION : { spaceId: owner.id, cells: [] };
  return { spaceId: null, cells: [cell] };
}

export function dragCells(selection: EditSelection, from: Cell, to: Cell): EditSelection {
  const keys = new Set(selection.cells.map(cellKey));
  const added = cellsInRect(from.x, from.y, to.x, to.y, from.layer).filter((c) => !keys.has(cellKey(c)));
  return { spaceId: null, cells: [...selection.cells, ...added] };
}
