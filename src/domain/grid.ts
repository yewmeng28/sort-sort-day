import type { Cell, Space } from './types';

export const cellKey = (c: Cell) => `${c.x},${c.y},${c.layer}`;

function uniqueCells(cells: Cell[]): Cell[] {
  const seen = new Map<string, Cell>();
  for (const c of cells) seen.set(cellKey(c), c);
  return [...seen.values()];
}

export function cellsInRect(x0: number, y0: number, x1: number, y1: number, layer: number): Cell[] {
  const cells: Cell[] = [];
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) cells.push({ x, y, layer });
  }
  return cells;
}

export function spaceAtCell(spaces: Space[], cell: Cell): Space | undefined {
  const key = cellKey(cell);
  return spaces.find((s) => s.cells.some((c) => cellKey(c) === key));
}

/** Spaces that touch any of the given cells. */
export function spacesTouching(spaces: Space[], cells: Cell[]): Space[] {
  const keys = new Set(cells.map(cellKey));
  return spaces.filter((s) => s.cells.some((c) => keys.has(cellKey(c))));
}

/**
 * Merge the selected cells into one space. Any existing spaces the selection touches are absorbed
 * (the first keeps its identity). Returns the resulting merged space and the ids of spaces that were absorbed.
 */
export function mergeSelection(
  spaces: Space[],
  selection: Cell[],
  fresh: () => Pick<Space, 'id' | 'roomId' | 'name' | 'color'>,
): { merged: Space; absorbedIds: string[] } {
  const touched = spacesTouching(spaces, selection);
  const base = touched[0] ?? { ...fresh(), cells: [] };
  const cells = uniqueCells([...touched.flatMap((s) => s.cells), ...selection]);
  return {
    merged: { ...base, cells },
    absorbedIds: touched.slice(1).map((s) => s.id),
  };
}

/** True when every selected cell belongs to a merged space (one with more than one cell). Any unmerged or empty cell makes this false. */
export function isMergedSelection(spaces: Space[], selection: Cell[]): boolean {
  return (
    selection.length > 0 &&
    selection.every((c) => {
      const owner = spaceAtCell(spaces, c);
      return owner !== undefined && owner.cells.length > 1;
    })
  );
}

/**
 * Split the selected cells of merged spaces into single-cell spaces. Each touched space keeps its identity (and items)
 * on its remaining cells, or on the first selected cell if the whole space was selected.
 * Returns the updated originals followed by the newly created spaces.
 */
export function unmergeSelection(spaces: Space[], selection: Cell[], newId: () => string): Space[] {
  const keys = new Set(selection.map(cellKey));
  const result: Space[] = [];
  for (const space of spacesTouching(spaces, selection)) {
    const picked = space.cells.filter((c) => keys.has(cellKey(c)));
    const rest = space.cells.filter((c) => !keys.has(cellKey(c)));
    const [kept, split] = rest.length ? [rest, picked] : [picked.slice(0, 1), picked.slice(1)];
    result.push({ ...space, cells: kept });
    split.forEach((cell, i) => result.push({ ...space, id: newId(), name: `${space.name} ${i + 2}`, cells: [cell] }));
  }
  return result;
}

/** Remove cells from every space. Spaces left with no cells are returned in `emptiedIds`. */
export function removeCells(spaces: Space[], cells: Cell[]): { updated: Space[]; emptiedIds: string[] } {
  const keys = new Set(cells.map(cellKey));
  const updated: Space[] = [];
  const emptiedIds: string[] = [];
  for (const s of spaces) {
    const remaining = s.cells.filter((c) => !keys.has(cellKey(c)));
    if (remaining.length === s.cells.length) continue;
    if (remaining.length === 0) emptiedIds.push(s.id);
    else updated.push({ ...s, cells: remaining });
  }
  return { updated, emptiedIds };
}

/** Make a space reach through every layer at the cells (x, y) it already covers. */
export function extendThroughLayers(space: Space, layerCount: number): Space {
  const cells = [...space.cells];
  for (const { x, y } of space.cells) {
    for (let layer = 0; layer < layerCount; layer++) cells.push({ x, y, layer });
  }
  return { ...space, cells: uniqueCells(cells) };
}

/** A line segment in cell units: [x1, y1, x2, y2]. */
export type Edge = [number, number, number, number];

/** Outer boundary of a space on one layer: only sides without a neighbouring cell of the same space, so merged cells show no inner lines. */
export function outlineEdges(cells: Cell[], layer: number): Edge[] {
  const keys = new Set(cells.map(cellKey));
  const edges: Edge[] = [];
  for (const { x, y, layer: cellLayer } of cells) {
    if (cellLayer !== layer) continue;
    const has = (dx: number, dy: number) => keys.has(cellKey({ x: x + dx, y: y + dy, layer }));
    if (!has(0, -1)) edges.push([x, y, x + 1, y]);
    if (!has(0, 1)) edges.push([x, y + 1, x + 1, y + 1]);
    if (!has(-1, 0)) edges.push([x, y, x, y + 1]);
    if (!has(1, 0)) edges.push([x + 1, y, x + 1, y + 1]);
  }
  return edges;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Largest axis-aligned rectangle fully covered by the space's cells on a layer; a good home for its label. */
export function largestRect(cells: Cell[], layer: number): Rect | undefined {
  const keys = new Set(cells.filter((c) => c.layer === layer).map(cellKey));
  let best: Rect | undefined;
  for (const key of keys) {
    const [x0, y0] = key.split(',').map(Number);
    let maxW = Number.POSITIVE_INFINITY;
    for (let y = y0; keys.has(cellKey({ x: x0, y, layer })); y++) {
      let run = 0;
      while (keys.has(cellKey({ x: x0 + run, y, layer }))) run++;
      maxW = Math.min(maxW, run);
      const h = y - y0 + 1;
      if (!best || maxW * h > best.w * best.h) best = { x: x0, y: y0, w: maxW, h };
    }
  }
  return best;
}

export const spaceLayers = (space: Space): number[] =>
  [...new Set(space.cells.map((c) => c.layer))].sort((a, b) => a - b);
