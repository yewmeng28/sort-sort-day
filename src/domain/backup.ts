import type { BackupFile, Category, Cell, Dismissal, Item, Progress, Room, Space } from './types';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);

function fail(path: string, expected: string): never {
  throw new Error(`Not a valid Sort Sort Day backup: ${path} ${expected}`);
}

/** Read an array field, treating a missing optional one as empty. */
function list(raw: Obj, key: string, optional = false): unknown[] {
  const value = raw[key];
  if (value === undefined && optional) return [];
  if (!Array.isArray(value)) fail(key, 'must be a list');
  return value;
}

function each<T>(values: unknown[], name: string, parse: (v: Obj, path: string) => T): T[] {
  return values.map((v, i) => {
    const path = `${name}[${i}]`;
    if (!isObj(v)) fail(path, 'must be an object');
    return parse(v, path);
  });
}

const room = (v: Obj, p: string): Room => {
  if (!isStr(v.id)) fail(`${p}.id`, 'must be text');
  if (!isStr(v.name)) fail(`${p}.name`, 'must be text');
  if (!isInt(v.cols) || v.cols < 1) fail(`${p}.cols`, 'must be a whole number of at least 1');
  if (!isInt(v.rows) || v.rows < 1) fail(`${p}.rows`, 'must be a whole number of at least 1');
  if (!Array.isArray(v.layers) || !v.layers.length || !v.layers.every(isStr)) fail(`${p}.layers`, 'must be a list of names');
  if (v.favorite !== undefined && typeof v.favorite !== 'boolean') fail(`${p}.favorite`, 'must be true or false');
  return { id: v.id, name: v.name, cols: v.cols, rows: v.rows, layers: v.layers, favorite: v.favorite };
};

const cell = (v: unknown, p: string): Cell => {
  if (!isObj(v) || !isInt(v.x) || !isInt(v.y) || !isInt(v.layer)) fail(p, 'must have whole-number x, y and layer');
  return { x: v.x as number, y: v.y as number, layer: v.layer as number };
};

const space = (v: Obj, p: string): Space => {
  if (!isStr(v.id)) fail(`${p}.id`, 'must be text');
  if (!isStr(v.roomId)) fail(`${p}.roomId`, 'must be text');
  if (!isStr(v.name)) fail(`${p}.name`, 'must be text');
  if (!isStr(v.color)) fail(`${p}.color`, 'must be text');
  if (!Array.isArray(v.cells)) fail(`${p}.cells`, 'must be a list');
  if (v.capacity !== undefined && !isNum(v.capacity)) fail(`${p}.capacity`, 'must be a number');
  return {
    id: v.id,
    roomId: v.roomId,
    name: v.name,
    color: v.color,
    cells: v.cells.map((c, i) => cell(c, `${p}.cells[${i}]`)),
    capacity: v.capacity,
  };
};

const item = (v: Obj, p: string): Item => {
  if (!isStr(v.id)) fail(`${p}.id`, 'must be text');
  if (!isStr(v.roomId)) fail(`${p}.roomId`, 'must be text');
  if (v.spaceId !== null && !isStr(v.spaceId)) fail(`${p}.spaceId`, 'must be text or null');
  if (!isStr(v.name)) fail(`${p}.name`, 'must be text');
  if (!isNum(v.qty)) fail(`${p}.qty`, 'must be a number');
  if (!isStr(v.category)) fail(`${p}.category`, 'must be text');
  if (!Array.isArray(v.tags) || !v.tags.every(isStr)) fail(`${p}.tags`, 'must be a list of text');
  if (v.useFrequency !== 1 && v.useFrequency !== 2 && v.useFrequency !== 3) fail(`${p}.useFrequency`, 'must be 1, 2 or 3');
  if (v.status !== 'stored' && v.status !== 'missing') fail(`${p}.status`, 'must be "stored" or "missing"');
  if (!isNum(v.updatedAt)) fail(`${p}.updatedAt`, 'must be a number');
  return {
    id: v.id,
    roomId: v.roomId,
    spaceId: v.spaceId,
    name: v.name,
    qty: v.qty,
    category: v.category,
    tags: v.tags,
    useFrequency: v.useFrequency,
    status: v.status,
    updatedAt: v.updatedAt,
  };
};

const category = (v: Obj, p: string): Category => {
  if (!isStr(v.id) || !isStr(v.name)) fail(p, 'must have text id and name');
  return { id: v.id, name: v.name };
};

const dismissal = (v: Obj, p: string): Dismissal => {
  if (!isStr(v.id) || !isNum(v.at)) fail(p, 'must have a text id and a numeric at');
  return { id: v.id, at: v.at };
};

const progress = (v: unknown): Progress | undefined => {
  if (v === undefined) return undefined;
  if (!isObj(v)) fail('progress', 'must be an object');
  if (!isNum(v.xp) || v.xp < 0) fail('progress.xp', 'must be a number of at least 0');
  if (!isInt(v.streak) || v.streak < 0) fail('progress.streak', 'must be a whole number of at least 0');
  if (!isInt(v.bestStreak) || v.bestStreak < 0) fail('progress.bestStreak', 'must be a whole number of at least 0');
  if (v.lastGoodDay !== null && !(isStr(v.lastGoodDay) && /^\d{4}-\d{2}-\d{2}$/.test(v.lastGoodDay))) {
    fail('progress.lastGoodDay', 'must be a YYYY-MM-DD date or null');
  }
  if (!isNum(v.threshold) || v.threshold < 1 || v.threshold > 100) fail('progress.threshold', 'must be between 1 and 100');
  return { id: 'main', xp: v.xp, streak: v.streak, bestStreak: v.bestStreak, lastGoodDay: v.lastGoodDay, threshold: v.threshold };
};

/**
 * Validate parsed backup JSON and normalise it, throwing a descriptive Error for anything malformed.
 * Backups from earlier versions lack the optional `categories`, `dismissed` and room `favorite` fields; they load as empty/off.
 */
export function parseBackup(raw: unknown): BackupFile {
  if (!isObj(raw)) fail('file', 'must be an object');
  if (raw.version !== 1) fail('version', 'must be 1');

  const rooms = each(list(raw, 'rooms'), 'rooms', room);
  const spaces = each(list(raw, 'spaces'), 'spaces', space);
  const items = each(list(raw, 'items'), 'items', item);
  const categories = each(list(raw, 'categories', true), 'categories', category);
  const dismissed = each(list(raw, 'dismissed', true), 'dismissed', dismissal);

  if (!rooms.length) fail('rooms', 'must contain at least one room');

  const roomIds = new Set(rooms.map((r) => r.id));
  const spaceIds = new Set(spaces.map((s) => s.id));
  spaces.forEach((s, i) => roomIds.has(s.roomId) || fail(`spaces[${i}].roomId`, `refers to a missing room "${s.roomId}"`));
  items.forEach((it, i) => {
    if (!roomIds.has(it.roomId)) fail(`items[${i}].roomId`, `refers to a missing room "${it.roomId}"`);
    if (it.spaceId !== null && !spaceIds.has(it.spaceId)) fail(`items[${i}].spaceId`, `refers to a missing space "${it.spaceId}"`);
  });

  return {
    version: 1,
    exportedAt: isNum(raw.exportedAt) ? raw.exportedAt : 0,
    rooms,
    spaces,
    items,
    categories,
    dismissed,
    progress: progress(raw.progress),
  };
}
