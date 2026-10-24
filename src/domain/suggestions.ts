import { spaceLayers } from './grid';
import type { Item, Space, Suggestion } from './types';

const stored = (items: Item[]) => items.filter((i) => i.status === 'stored' && i.spaceId);

const countIn = (items: Item[], spaceId: string) => items.filter((i) => i.spaceId === spaceId).length;

/** Free slots in a space; spaces without a capacity are treated as always having room. */
const freeSlots = (space: Space, items: Item[]) =>
  space.capacity === undefined ? Number.POSITIVE_INFINITY : space.capacity - countIn(items, space.id);

/** Spaces ordered with the most free room first. */
const emptiest = (spaces: Space[], items: Item[]) =>
  [...spaces].sort((a, b) => freeSlots(b, items) - freeSlots(a, items));

export function suggest(spaces: Space[], allItems: Item[], layerCount: number): Suggestion[] {
  const items = stored(allItems);
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const name = (id: string) => spaceById.get(id)?.name ?? 'somewhere';
  const out: Suggestion[] = [];

  // 1. Category scatter: gather a category into the space that already holds most of it.
  const byCategory = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.category.trim().toLowerCase();
    if (!key) continue;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }
  for (const [category, group] of byCategory) {
    const perSpace = new Map<string, number>();
    for (const i of group) perSpace.set(i.spaceId!, (perSpace.get(i.spaceId!) ?? 0) + 1);
    if (perSpace.size < 2) continue;
    const [target] = [...perSpace.entries()].sort((a, b) => b[1] - a[1])[0];
    const strays = group.filter((i) => i.spaceId !== target);
    out.push({
      id: `consolidate:${category}`,
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
