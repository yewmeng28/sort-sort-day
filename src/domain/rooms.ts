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

/** Put an item into a space, following the space to its room. */
export const moveItem = (item: Item, space: Space, now: number): Item => ({
  ...item,
  spaceId: space.id,
  roomId: space.roomId,
  status: 'stored',
  updatedAt: now,
});
