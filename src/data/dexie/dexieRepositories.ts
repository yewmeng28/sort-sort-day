import type { Repositories } from '../repositories';
import { SortSortDayDb } from './db';

export function createDexieRepositories(db = new SortSortDayDb()): Repositories {
  return {
    rooms: {
      list: () => db.rooms.toArray(),
      get: (id) => db.rooms.get(id),
      save: async (room) => void (await db.rooms.put(room)),
      remove: (id) => db.rooms.delete(id),
    },
    spaces: {
      list: () => db.spaces.toArray(),
      get: (id) => db.spaces.get(id),
      save: async (space) => void (await db.spaces.put(space)),
      remove: (id) => db.spaces.delete(id),
      apply: ({ save = [], remove = [] }) =>
        db.transaction('rw', db.spaces, async () => {
          await db.spaces.bulkPut(save);
          await db.spaces.bulkDelete(remove);
        }),
    },
    items: {
      list: () => db.items.toArray(),
      get: (id) => db.items.get(id),
      save: async (item) => void (await db.items.put(item)),
      remove: (id) => db.items.delete(id),
    },
    categories: {
      list: () => db.categories.toArray(),
      get: (id) => db.categories.get(id),
      save: async (category) => void (await db.categories.put(category)),
      remove: (id) => db.categories.delete(id),
    },
    backup: {
      exportAll: async () => ({
        version: 1,
        exportedAt: Date.now(),
        rooms: await db.rooms.toArray(),
        spaces: await db.spaces.toArray(),
        items: await db.items.toArray(),
        categories: await db.categories.toArray(),
      }),
      importAll: (backup) =>
        db.transaction('rw', db.rooms, db.spaces, db.items, db.categories, async () => {
          await Promise.all([db.rooms.clear(), db.spaces.clear(), db.items.clear(), db.categories.clear()]);
          await db.rooms.bulkPut(backup.rooms);
          await db.spaces.bulkPut(backup.spaces);
          await db.items.bulkPut(backup.items);
          await db.categories.bulkPut(backup.categories ?? []);
        }),
    },
  };
}
