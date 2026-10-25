export interface Cell {
  x: number;
  y: number;
  layer: number;
}

export interface Room {
  id: string;
  name: string;
  cols: number;
  rows: number;
  layers: string[];
  /** Favourite rooms are listed first. */
  favorite?: boolean;
}

/** A storage space owns a set of (x, y, layer) cells. A tall cupboard spans layers; a wall cupboard has only a high layer. */
export interface Space {
  id: string;
  roomId: string;
  name: string;
  cells: Cell[];
  color: string;
  /** Max number of distinct items before the space counts as overfull. */
  capacity?: number;
}

export type ItemStatus = 'stored' | 'missing';

export interface Item {
  id: string;
  roomId: string;
  /** null while the item is missing or not yet placed (lives in "the Den"). */
  spaceId: string | null;
  name: string;
  qty: number;
  category: string;
  tags: string[];
  /** 1 = rarely used, 3 = used all the time. */
  useFrequency: 1 | 2 | 3;
  status: ItemStatus;
  updatedAt: number;
}

/** A saved category the user can pick when adding items. `id` is the lowercased name, so names are unique ignoring case. */
export interface Category {
  id: string;
  name: string;
}

/** A quest the user cancelled; it stays hidden until restored. `id` is the suggestion id. */
export interface Dismissal {
  id: string;
  at: number;
}

export interface Suggestion {
  /** Stable across runs so a cancelled quest stays cancelled. */
  id: string;
  kind: 'consolidate' | 'overfull' | 'accessibility' | 'room';
  message: string;
  itemIds: string[];
  toSpaceId: string;
}

export interface BackupFile {
  version: 1;
  exportedAt: number;
  rooms: Room[];
  spaces: Space[];
  items: Item[];
  /** Absent in backups made before categories existed. */
  categories?: Category[];
  dismissed?: Dismissal[];
}
