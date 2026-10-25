import { spaceLayers } from './grid';
import type { Item, Room, Space, Suggestion } from './types';

const stored = (items: Item[]) => items.filter((i) => i.status === 'stored' && i.spaceId);

const countIn = (items: Item[], spaceId: string) => items.filter((i) => i.spaceId === spaceId).length;

/** Free slots in a space; spaces without a capacity are treated as always having room. */
const freeSlots = (space: Space, items: Item[]) =>
  space.capacity === undefined ? Number.POSITIVE_INFINITY : space.capacity - countIn(items, space.id);

/** Spaces ordered with the most free room first. */
const emptiest = (spaces: Space[], items: Item[]) =>
  [...spaces].sort((a, b) => freeSlots(b, items) - freeSlots(a, items));

/** Group items by lowercased category, skipping uncategorised ones. */
function groupByCategory(items: Item[]): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.category.trim().toLowerCase();
    if (key) groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

/** The key with the highest count, or undefined if there is none or the top spot is tied. */
function clearWinner(counts: Map<string, number>): string | undefined {
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked.length > 1 && ranked[0][1] === ranked[1][1])) return undefined;
  return ranked[0][0];
}

/** Quests within one room. Pass only that room's spaces and items. */
export function suggest(roomId: string, spaces: Space[], allItems: Item[], layerCount: number): Suggestion[] {
  const items = stored(allItems);
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const name = (id: string) => spaceById.get(id)?.name ?? 'somewhere';
  const out: Suggestion[] = [];

  // 1. Category scatter: gather a category into the space that already holds most of it.
  for (const [category, group] of groupByCategory(items)) {
    const perSpace = new Map<string, number>();
    for (const i of group) perSpace.set(i.spaceId!, (perSpace.get(i.spaceId!) ?? 0) + 1);
    if (perSpace.size < 2) continue;
    const [target] = [...perSpace.entries()].sort((a, b) => b[1] - a[1])[0];
    const strays = group.filter((i) => i.spaceId !== target);
    out.push({
      id: `consolidate:${roomId}:${category}`,
      kind: 'consolidate',
      message: `Gather ${strays.length} "${category}" item(s) into ${name(target)}`,
      itemIds: strays.map((i) => i.id),
      toSpaceId: target,
    });
  }

  // 2. Overfull: move the least-used items to the emptiest space with room.
  for (const space of spaces) {
    if (space.capacity === undefined) continue;
    const excess = countIn(items, space.id) - space.capacity;
    if (excess <= 0) continue;
    const target = emptiest(
      spaces.filter((s) => s.id !== space.id),
      items,
    ).find((s) => freeSlots(s, items) >= excess);
    if (!target) continue;
    const movers = items
      .filter((i) => i.spaceId === space.id)
      .sort((a, b) => a.useFrequency - b.useFrequency)
      .slice(0, excess);
    out.push({
      id: `overfull:${space.id}`,
      kind: 'overfull',
      message: `${space.name} is overfull: move ${movers.map((i) => i.name).join(', ')} to ${target.name}`,
      itemIds: movers.map((i) => i.id),
      toSpaceId: target.id,
    });
  }

  // 3. Accessibility: things used all the time shouldn't live only on the top layer.
  if (layerCount > 2) {
    const top = layerCount - 1;
    const reachable = spaces.filter((s) => spaceLayers(s).some((l) => l < top));
    for (const item of items) {
      const home = spaceById.get(item.spaceId!);
      if (!home || item.useFrequency < 3) continue;
      if (!spaceLayers(home).every((l) => l === top)) continue;
      const target = emptiest(reachable, items).find((s) => freeSlots(s, items) > 0);
      if (!target) continue;
      out.push({
        id: `access:${item.id}`,
        kind: 'accessibility',
        message: `${item.name} is used often but sits high up: move it to ${target.name}`,
        itemIds: [item.id],
        toSpaceId: target.id,
      });
    }
  }

  return out;
}

/**
 * Quests across rooms: when a category is spread over several rooms, move the smaller groups into the room that
 * holds most of it, into the space that already holds that category (or the emptiest one) if it has room.
 * Ties are skipped because there is no clear home.
 */
export function suggestInterRoom(rooms: Room[], spaces: Space[], allItems: Item[]): Suggestion[] {
  const items = stored(allItems);
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? 'another room';
  const out: Suggestion[] = [];

  for (const [category, group] of groupByCategory(items)) {
    const perRoom = new Map<string, Item[]>();
    for (const i of group) perRoom.set(i.roomId, [...(perRoom.get(i.roomId) ?? []), i]);
    if (perRoom.size < 2) continue;

    const homeRoomId = clearWinner(new Map([...perRoom].map(([id, list]) => [id, list.length])));
    if (!homeRoomId) continue;

    const homeSpaces = spaces.filter((s) => s.roomId === homeRoomId);
    const perSpace = new Map<string, number>();
    for (const i of perRoom.get(homeRoomId)!) perSpace.set(i.spaceId!, (perSpace.get(i.spaceId!) ?? 0) + 1);
    const categoryHome = clearWinner(perSpace) ?? [...perSpace.keys()][0];
    const candidates = [spaceById.get(categoryHome), ...emptiest(homeSpaces, items)].filter((s): s is Space => !!s);

    for (const [roomId, strays] of perRoom) {
      if (roomId === homeRoomId) continue;
      const target = candidates.find((s) => freeSlots(s, items) >= strays.length);
      if (!target) continue;
      out.push({
        id: `room:${category}:${roomId}`,
        kind: 'room',
        message: `Move ${strays.length} "${category}" item(s) from ${roomName(roomId)} to ${target.name} in ${roomName(homeRoomId)}`,
        itemIds: strays.map((i) => i.id),
        toSpaceId: target.id,
      });
    }
  }

  return out;
}
