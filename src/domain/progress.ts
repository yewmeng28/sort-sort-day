import { suggest, suggestInterRoom } from './suggestions';
import type { Item, Progress, Room, Space, Suggestion } from './types';

export const DEFAULT_PROGRESS: Progress = { id: 'main', xp: 0, streak: 0, bestStreak: 0, lastGoodDay: null, threshold: 80 };

/** XP rewards. Moving items back and forth earns XP too, so treat it as a fun counter, not a leaderboard. */
export const XP = { questItem: 10, moveItem: 3, findItem: 5, addItem: 2, streakDay: 25 } as const;

const TITLES = ['Clutter Cub', 'Shelf Scout', 'Tidy Hunter', 'Hoard Warden', 'Stash Master', 'Wyrm Tamer'];

/** Total XP needed to reach a level (level 1 = 0). */
export const xpForLevel = (level: number) => 50 * (level - 1) ** 2;

export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  return {
    level,
    title: TITLES[Math.min(Math.floor((level - 1) / 2), TITLES.length - 1)],
    into: xp - floor,
    needed: xpForLevel(level + 1) - floor,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export const localDay = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

/**
 * Count today towards the streak if the packing score meets the threshold. Idempotent within a day, and returns the
 * same object when nothing changes. A missed day restarts the streak at 1 on the next good day.
 */
export function recordDay(progress: Progress, day: string, percent: number): Progress {
  if (percent < progress.threshold || progress.lastGoodDay === day) return progress;
  const streak = progress.lastGoodDay === previousDay(day) ? progress.streak + 1 : 1;
  return {
    ...progress,
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    lastGoodDay: day,
    xp: progress.xp + XP.streakDay,
  };
}

/** The streak to show today: it lapses to 0 once a full day has passed without a good day. */
export function effectiveStreak(progress: Progress, today: string): number {
  return progress.lastGoodDay === today || progress.lastGoodDay === previousDay(today) ? progress.streak : 0;
}

/** Every quest across every room, including those between rooms. */
export function allQuests(rooms: Room[], spaces: Space[], items: Item[]): Suggestion[] {
  return [
    ...rooms.flatMap((room) =>
      suggest(
        room.id,
        spaces.filter((s) => s.roomId === room.id),
        items.filter((i) => i.roomId === room.id),
        room.layers.length,
      ),
    ),
    ...suggestInterRoom(rooms, spaces, items),
  ];
}

/**
 * Packing score: the share of items that are neither lost nor part of an outstanding quest. 100% means nothing is
 * left to tidy. Cancelled quests don't count against you (your call), and the score never rounds up to 100.
 */
export function packingScore(items: Item[], quests: Suggestion[], cancelledIds: Set<string>) {
  const misplaced = new Set<string>();
  for (const item of items) if (item.status === 'missing' || !item.spaceId) misplaced.add(item.id);
  for (const quest of quests) if (!cancelledIds.has(quest.id)) quest.itemIds.forEach((id) => misplaced.add(id));
  const total = items.length;
  return {
    percent: total === 0 ? 100 : Math.floor((100 * (total - misplaced.size)) / total),
    misplaced: misplaced.size,
    total,
  };
}
