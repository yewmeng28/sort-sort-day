import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

/** A backup in the format written before categories, cancelled quests and favourite rooms existed. */
const oldBackup = () => ({
  version: 1,
  exportedAt: 1_700_000_000_000,
  rooms: [{ id: 'default', name: 'My room', cols: 6, rows: 5, layers: ['Floor', 'Mid', 'High'] }],
  spaces: [
    { id: 's1', roomId: 'default', name: 'Wardrobe', color: '#8a5a2b', cells: [{ x: 0, y: 0, layer: 0 }, { x: 0, y: 0, layer: 1 }], capacity: 10 },
    { id: 's2', roomId: 'default', name: 'Desk', color: '#5b7b4a', cells: [{ x: 2, y: 1, layer: 0 }] },
  ],
  items: [
    { id: 'i1', roomId: 'default', spaceId: 's1', name: 'Scissors', qty: 2, category: 'Craft', tags: [], useFrequency: 2, status: 'stored', updatedAt: 1 },
    { id: 'i2', roomId: 'default', spaceId: null, name: 'Tape', qty: 1, category: '', tags: ['sticky'], useFrequency: 3, status: 'missing', updatedAt: 2 },
  ],
});

const withChange = (change: (b: ReturnType<typeof oldBackup>) => void) => {
  const b = oldBackup();
  change(b);
  return b;
};

describe('parseBackup', () => {
  it('loads an old-format backup, defaulting the newer optional fields', () => {
    const parsed = parseBackup(oldBackup());
    expect(parsed.rooms).toHaveLength(1);
    expect(parsed.rooms[0].favorite).toBeUndefined();
    expect(parsed.spaces).toHaveLength(2);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.categories).toEqual([]);
    expect(parsed.dismissed).toEqual([]);
    expect(parsed.exportedAt).toBe(1_700_000_000_000);
  });

  it('keeps the newer fields when present', () => {
    const parsed = parseBackup({
      ...oldBackup(),
      rooms: [{ id: 'default', name: 'My room', cols: 6, rows: 5, layers: ['Floor'], favorite: true }],
      categories: [{ id: 'craft', name: 'Craft' }],
      dismissed: [{ id: 'consolidate:default:craft', at: 5 }],
    });
    expect(parsed.rooms[0].favorite).toBe(true);
    expect(parsed.categories).toEqual([{ id: 'craft', name: 'Craft' }]);
    expect(parsed.dismissed).toEqual([{ id: 'consolidate:default:craft', at: 5 }]);
  });

  it('loads XP and streak progress, and rejects a malformed one', () => {
    const progress = { id: 'main', xp: 120, streak: 3, bestStreak: 5, lastGoodDay: '2026-10-24', threshold: 80 };
    expect(parseBackup({ ...oldBackup(), progress }).progress).toEqual(progress);
    expect(parseBackup(oldBackup()).progress).toBeUndefined();
    expect(() => parseBackup({ ...oldBackup(), progress: { ...progress, threshold: 150 } })).toThrow(/progress\.threshold/);
    expect(() => parseBackup({ ...oldBackup(), progress: { ...progress, lastGoodDay: 'yesterday' } })).toThrow(/progress\.lastGoodDay/);
  });

  it('round-trips its own output', () => {
    const once = parseBackup(oldBackup());
    expect(parseBackup(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });

  it.each([
    ['null', null, /file must be an object/],
    ['an array', [], /file must be an object/],
    ['a wrong version', { ...oldBackup(), version: 2 }, /version must be 1/],
    ['missing rooms', { ...oldBackup(), rooms: undefined }, /rooms must be a list/],
    ['items that are not a list', { ...oldBackup(), items: 'nope' }, /items must be a list/],
    ['an empty room list', { ...oldBackup(), rooms: [] }, /at least one room/],
    ['categories that are not a list', { ...oldBackup(), categories: {} }, /categories must be a list/],
  ])('rejects %s', (_name, input, message) => {
    expect(() => parseBackup(input)).toThrow(message);
  });

  it('names the exact field when an entry is malformed', () => {
    expect(() => parseBackup(withChange((b) => void ((b.items[1] as { qty: unknown }).qty = 'two')))).toThrow(/items\[1\]\.qty/);
    expect(() => parseBackup(withChange((b) => void ((b.items[0] as { status: unknown }).status = 'lost')))).toThrow(/items\[0\]\.status/);
    expect(() => parseBackup(withChange((b) => void ((b.rooms[0] as { cols: unknown }).cols = 0)))).toThrow(/rooms\[0\]\.cols/);
    expect(() => parseBackup(withChange((b) => void ((b.spaces[0].cells[1] as { x: unknown }).x = 'a')))).toThrow(/spaces\[0\]\.cells\[1\]/);
    expect(() => parseBackup(withChange((b) => void (b.items[0] = null as never)))).toThrow(/items\[0\] must be an object/);
  });

  it('rejects references to rooms or spaces that do not exist', () => {
    expect(() => parseBackup(withChange((b) => void (b.spaces[0].roomId = 'gone')))).toThrow(/spaces\[0\]\.roomId.*missing room/);
    expect(() => parseBackup(withChange((b) => void (b.items[0].roomId = 'gone')))).toThrow(/items\[0\]\.roomId.*missing room/);
    expect(() => parseBackup(withChange((b) => void (b.items[0].spaceId = 'gone')))).toThrow(/items\[0\]\.spaceId.*missing space/);
  });
});
