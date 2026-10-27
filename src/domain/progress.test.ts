import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESS,
  XP,
  allQuests,
  effectiveStreak,
  levelFromXp,
  levelProgress,
  packingScore,
  previousDay,
  recordDay,
  xpForLevel,
} from './progress';
import { editRoom, moveSpace, spanAllLayers } from './rooms';
import type { Item, Room, Space, Suggestion } from './types';

const room: Room = { id: 'r', name: 'Study', cols: 4, rows: 3, layers: ['Floor', 'Mid', 'High'] };

const space = (id: string, cells: Space['cells'], extra: Partial<Space> = {}): Space => ({
  id,
  roomId: 'r',
  name: id,
  color: '#999',
  cells,
  ...extra,
});

const item = (id: string, spaceId: string | null, extra: Partial<Item> = {}): Item => ({
  id,
  roomId: 'r',
  spaceId,
  name: id,
  qty: 1,
  category: '',
  tags: [],
  useFrequency: 2,
  status: 'stored',
  updatedAt: 0,
  ...extra,
});

describe('editRoom', () => {
  const tall = space('tall', [{ x: 3, y: 2, layer: 0 }, { x: 3, y: 2, layer: 2 }]);

  it('grows the grid, renames layers and adds layers freely', () => {
    const result = editRoom(room, [tall], { name: ' Office ', cols: 6, rows: 5, layers: ['Ground', 'Desk', 'Shelf', 'Ceiling'] });
    expect(result).toEqual({ ok: true, value: { ...room, name: 'Office', cols: 6, rows: 5, layers: ['Ground', 'Desk', 'Shelf', 'Ceiling'] } });
  });

  it('refuses to shrink past storage cells or drop a layer in use', () => {
    const narrower = editRoom(room, [tall], { name: 'Study', cols: 3, rows: 3, layers: room.layers });
    expect(narrower.ok).toBe(false);
    if (!narrower.ok) expect(narrower.error).toMatch(/2 storage cell/);
    expect(editRoom(room, [tall], { name: 'Study', cols: 4, rows: 3, layers: ['Floor', 'Mid'] }).ok).toBe(false);
  });

  it('ignores spaces in other rooms and requires a name', () => {
    const elsewhere = space('x', [{ x: 9, y: 9, layer: 5 }], { roomId: 'other' });
    expect(editRoom(room, [elsewhere], { name: 'Study', cols: 1, rows: 1, layers: ['Floor'] }).ok).toBe(true);
    expect(editRoom(room, [], { name: '  ', cols: 4, rows: 3, layers: room.layers }).ok).toBe(false);
  });
});

describe('moveSpace', () => {
  // An L-shaped space that spans two layers at (0,0).
  const ell = space('ell', [
    { x: 0, y: 0, layer: 0 },
    { x: 0, y: 1, layer: 0 },
    { x: 1, y: 1, layer: 0 },
    { x: 0, y: 0, layer: 1 },
  ]);

  it('shifts every cell on every layer, keeping the shape', () => {
    const result = moveSpace(room, [ell], 'ell', 1, 1);
    expect(result.ok && result.value.cells).toEqual([
      { x: 1, y: 1, layer: 0 },
      { x: 1, y: 2, layer: 0 },
      { x: 2, y: 2, layer: 0 },
      { x: 1, y: 1, layer: 1 },
    ]);
  });

  it('stops at the walls', () => {
    expect(moveSpace(room, [ell], 'ell', -1, 0)).toEqual({ ok: false, error: 'That is the edge of the room.' });
    expect(moveSpace(room, [ell], 'ell', 0, 2).ok).toBe(false);
  });

  it('refuses to overlap another space on the same layer only', () => {
    const blockerSameLayer = space('b', [{ x: 2, y: 1, layer: 0 }]);
    expect(moveSpace(room, [ell, blockerSameLayer], 'ell', 1, 0)).toEqual({ ok: false, error: 'Another space is in the way.' });
    const blockerOtherLayer = space('b', [{ x: 2, y: 1, layer: 2 }]);
    expect(moveSpace(room, [ell, blockerOtherLayer], 'ell', 1, 0).ok).toBe(true);
  });
});

describe('spanAllLayers', () => {
  it('extends a space through every layer', () => {
    const result = spanAllLayers(room, [space('desk', [{ x: 1, y: 1, layer: 1 }])], 'desk');
    expect(result.ok && result.value.cells.map((c) => c.layer).sort()).toEqual([0, 1, 2]);
  });

  it('refuses when another space sits above or below', () => {
    const desk = space('desk', [{ x: 1, y: 1, layer: 1 }]);
    const shelf = space('shelf', [{ x: 1, y: 1, layer: 2 }]);
    expect(spanAllLayers(room, [desk, shelf], 'desk')).toEqual({ ok: false, error: 'Another space is in the way on the High layer.' });
  });
});

describe('levels', () => {
  it('maps XP to levels on a growing curve', () => {
    expect([0, 49, 50, 199, 200, 450].map(levelFromXp)).toEqual([1, 1, 2, 2, 3, 4]);
    expect(xpForLevel(1)).toBe(0);
    expect(levelProgress(75)).toEqual({ level: 2, title: 'Clutter Cub', into: 25, needed: 150 });
    expect(levelProgress(xpForLevel(3)).title).toBe('Shelf Scout');
  });
});

describe('streaks', () => {
  const at = (extra: Partial<typeof DEFAULT_PROGRESS>) => ({ ...DEFAULT_PROGRESS, ...extra });

  it('handles month and year boundaries when finding yesterday', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });

  it('starts, extends and restarts a streak, awarding XP once per good day', () => {
    const first = recordDay(DEFAULT_PROGRESS, '2026-10-24', 85);
    expect(first).toMatchObject({ streak: 1, bestStreak: 1, lastGoodDay: '2026-10-24', xp: XP.streakDay });

    expect(recordDay(first, '2026-10-24', 95)).toBe(first); // same day: no change

    const second = recordDay(first, '2026-10-25', 80);
    expect(second).toMatchObject({ streak: 2, bestStreak: 2, xp: 2 * XP.streakDay });

    const afterGap = recordDay(second, '2026-10-28', 90);
    expect(afterGap).toMatchObject({ streak: 1, bestStreak: 2 });
  });

  it('ignores days below the threshold', () => {
    const p = at({ threshold: 90 });
    expect(recordDay(p, '2026-10-24', 89)).toBe(p);
  });

  it('shows a lapsed streak as 0 once a full day is missed', () => {
    const p = at({ streak: 4, lastGoodDay: '2026-10-24' });
    expect(effectiveStreak(p, '2026-10-24')).toBe(4);
    expect(effectiveStreak(p, '2026-10-25')).toBe(4); // still time today
    expect(effectiveStreak(p, '2026-10-26')).toBe(0);
  });
});

describe('packingScore', () => {
  const quest = (id: string, itemIds: string[]): Suggestion => ({ id, kind: 'consolidate', message: '', reason: '', itemIds, toSpaceId: 's' });

  it('counts lost items and items in open quests, never rounding up to 100', () => {
    const items = [item('a', 's'), item('b', 's'), item('c', null, { status: 'missing' }), item('d', 's')];
    expect(packingScore(items, [quest('q', ['a', 'a'])], new Set())).toEqual({ percent: 50, misplaced: 2, total: 4 });
    const many = Array.from({ length: 1000 }, (_, i) => item(`i${i}`, 's'));
    expect(packingScore(many, [quest('q', ['i0'])], new Set()).percent).toBe(99);
  });

  it('does not count cancelled quests, and an empty inventory is 100%', () => {
    const items = [item('a', 's'), item('b', 's')];
    expect(packingScore(items, [quest('q', ['a'])], new Set(['q'])).percent).toBe(100);
    expect(packingScore([], [], new Set())).toEqual({ percent: 100, misplaced: 0, total: 0 });
  });

  it('gathers quests from every room plus between rooms', () => {
    const rooms: Room[] = [room, { ...room, id: 'r2', name: 'Bedroom' }];
    const spaces = [space('desk', []), space('shelf', []), space('wardrobe', [], { roomId: 'r2' })];
    const items = [
      item('c1', 'desk', { category: 'Cables' }),
      item('c2', 'desk', { category: 'Cables' }),
      item('c3', 'shelf', { category: 'Cables' }),
      item('c4', 'wardrobe', { roomId: 'r2', category: 'Cables' }),
    ];
    expect(allQuests(rooms, spaces, items).map((q) => q.kind).sort()).toEqual(['consolidate', 'room']);
  });
});
