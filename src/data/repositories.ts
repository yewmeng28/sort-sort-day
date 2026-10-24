import type { BackupFile, Category, Item, Room, Space } from '../domain/types';

export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  save(entity: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export type RoomRepository = Repository<Room>;
export type SpaceRepository = Repository<Space> & {
  /** Apply several changes atomically, e.g. a merge that saves one space and removes the absorbed ones. */
  apply(changes: { save?: Space[]; remove?: string[] }): Promise<void>;
};
export type ItemRepository = Repository<Item>;

export type CategoryRepository = Repository<Category>;

export interface BackupRepository {
  exportAll(): Promise<BackupFile>;
  importAll(backup: BackupFile): Promise<void>;
}

export interface Repositories {
  rooms: RoomRepository;
  spaces: SpaceRepository;
  items: ItemRepository;
  categories: CategoryRepository;
  backup: BackupRepository;
}
