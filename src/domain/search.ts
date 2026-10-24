import MiniSearch from 'minisearch';
import type { Item } from './types';

/** Fuzzy, prefix-friendly search over item name, category and tags. Rebuilt per call; inventories are small. */
export function searchItems(items: Item[], query: string): Item[] {
  const q = query.trim();
  if (!q) return [];
  const index = new MiniSearch<Item & { tagText: string }>({
    fields: ['name', 'category', 'tagText'],
    storeFields: ['id'],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { name: 2 } },
  });
  index.addAll(items.map((i) => ({ ...i, tagText: i.tags.join(' ') })));
  const byId = new Map(items.map((i) => [i.id, i]));
  return index.search(q).flatMap((hit) => byId.get(hit.id) ?? []);
}
