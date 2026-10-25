import { cellKey } from './grid';
import type { Item, Room, Space } from './types';

export const DEFAULT_LAYERS = ['Floor', 'Mid', 'High'];
const MAX_LAYERS = 6;
const MAX_GRID = 20;

/** Favourites first, then alphabetical. */
export function sortRooms(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name));
}

/** "Floor, Mid, High" → layer names; falls back to the defaults when empty. */
export function parseLayers(text: string): string[] {
  const layers = text
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LAYERS);
  return layers.length ? layers : DEFAULT_LAYERS;
}

export const clampGrid = (n: number, fallback: number) =>
  Number.isFinite(n) && n >= 1 ? Math.min(Math.round(n), MAX_GRID) : fallback;

export type EditResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Apply new name, grid size and layer names to a room. Refused when the smaller grid or fewer layers would leave
 * storage cells outside the room, so no space is ever clipped or lost.
 */
export function editRoom(
  room: Room,
  spaces: Space[],
  edit: { name: string; cols: number; rows: number; layers: string[] },
): EditResult<Room> {
  const name = edit.name.trim();
  if (!name) return { ok: false, error: 'Give the room a name.' };
  const cols = clampGrid(edit.cols, room.cols);
  const rows = clampGrid(edit.rows, room.rows);
  const layers = edit.layers;
  const outside = spaces
    .filter((s) => s.roomId === room.id)
    .flatMap((s) => s.cells)
    .filter((c) => c.x >= cols || c.y >= rows || c.layer >= layers.length).length;
  if (outside) {
    return { ok: false, error: `${outside} storage cell(s) would fall outside the new size. Move or clear those spaces first.` };
  }
  return { ok: true, value: { ...room, name, cols, rows, layers } };
}

/** Shift a whole space (every cell, on every layer) by dx, dy. Merged spaces stay merged; moves into walls or other spaces are refused. */
export function moveSpace(room: Room, spaces: Space[], spaceId: string, dx: number, dy: number): EditResult<Space> {
  const space = spaces.find((s) => s.id === spaceId);
  if (!space) return { ok: false, error: 'That space no longer exists.' };
  const cells = space.cells.map((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
  if (cells.some((c) => c.x < 0 || c.y < 0 || c.x >= room.cols || c.y >= room.rows)) {
    return { ok: false, error: 'That is the edge of the room.' };
  }
  const taken = new Set(spaces.filter((s) => s.id !== spaceId).flatMap((s) => s.cells.map(cellKey)));
  if (cells.some((c) => taken.has(cellKey(c)))) return { ok: false, error: 'Another space is in the way.' };
  return { ok: true, value: { ...space, cells } };
}

/** Put an item into a space, following the space to its room. */
export const moveItem = (item: Item, space: Space, now: number): Item => ({
  ...item,
  spaceId: space.id,
  roomId: space.roomId,
  status: 'stored',
  updatedAt: now,
});
