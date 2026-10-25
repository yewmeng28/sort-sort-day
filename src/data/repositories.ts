import type { BackupFile, Category, Dismissal, Item, Progress, Room, Space } from '../domain/types';

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
export type DismissalRepository = Repository<Dismissal>;

export interface ProgressRepository {
  get(): Promise<Progress>;
  /** Atomically transform the progress row; returning the same object skips the write. */
  update(change: (progress: Progress) => Progress): Promise<void>;
}

export interface BackupRepository {
  exportAll(): Promise<BackupFile>;
  importAll(backup: BackupFile): Promise<void>;
}

export interface Repositories {
  rooms: RoomRepository;
  spaces: SpaceRepository;
  items: ItemRepository;
  categories: CategoryRepository;
  dismissals: DismissalRepository;
  progress: ProgressRepository;
  backup: BackupRepository;
}
