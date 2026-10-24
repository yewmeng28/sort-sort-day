import type { Category, Item } from './types';

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** What to persist after a category rename or delete. */
export interface CategoryChange {
  saveCategories: Category[];
  removeCategoryIds: string[];
  /** Only the items whose category changed. */
  items: Item[];
}

/**
 * Rename a category and every item using it. Renaming onto another existing category merges into it
 * (keeping that category's spelling). Returns null when there is nothing to do.
 */
export function renameCategory(saved: Category[], items: Item[], from: string, to: string, now: number): CategoryChange | null {
  const target = to.trim();
  if (!target || target === from) return null;
  const finalName = categoryNames(saved, items).find((n) => sameName(n, target) && !sameName(n, from)) ?? target;
  return {
    saveCategories: [{ id: finalName.toLowerCase(), name: finalName }],
    removeCategoryIds: sameName(from, finalName) ? [] : [from.toLowerCase()],
    items: items.filter((i) => sameName(i.category, from)).map((i) => ({ ...i, category: finalName, updatedAt: now })),
  };
}

/** Delete a category; items that used it become uncategorised. */
export function deleteCategory(items: Item[], name: string, now: number): CategoryChange {
  return {
    saveCategories: [],
    removeCategoryIds: [name.toLowerCase()],
    items: items.filter((i) => sameName(i.category, name)).map((i) => ({ ...i, category: '', updatedAt: now })),
  };
}

/** Saved categories plus any already used by items (e.g. entered before the list existed), deduped ignoring case and sorted. */
export function categoryNames(saved: Category[], items: Item[]): string[] {
  const byKey = new Map<string, string>();
  for (const name of [...saved.map((c) => c.name), ...items.map((i) => i.category)]) {
    const trimmed = name.trim();
    if (trimmed && !byKey.has(trimmed.toLowerCase())) byKey.set(trimmed.toLowerCase(), trimmed);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
