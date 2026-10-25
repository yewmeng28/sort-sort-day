import Dexie, { type EntityTable } from 'dexie';
import type { Category, Dismissal, Item, Progress, Room, Space } from '../../domain/types';

export class SortSortDayDb extends Dexie {
  rooms!: EntityTable<Room, 'id'>;
  spaces!: EntityTable<Space, 'id'>;
  items!: EntityTable<Item, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  dismissedQuests!: EntityTable<Dismissal, 'id'>;
  progress!: EntityTable<Progress, 'id'>;

  constructor() {
    super('sort-sort-day');
    this.version(1).stores({
      rooms: 'id',
      spaces: 'id, roomId',
      items: 'id, roomId, spaceId, status, category',
    });
    this.version(2).stores({
      categories: 'id',
    });
    this.version(3).stores({
      dismissedQuests: 'id',
    });
    this.version(4).stores({
      progress: 'id',
    });
  }
}
