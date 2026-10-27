import type { Item } from './types';

export const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
] as const satisfies readonly { value: Item['useFrequency']; label: string }[];

export const frequencyLabel = (f: Item['useFrequency']) => FREQUENCY_OPTIONS.find((o) => o.value === f)!.label;

/** "5 of 4 · overfull", "3 of 6", or "2 items" when the space has no limit. */
export function fullnessText(count: number, capacity: number | undefined): string {
  if (capacity === undefined) return `${count} ${count === 1 ? 'item' : 'items'}`;
  return `${count} of ${capacity}${count > capacity ? ' · overfull' : ''}`;
}
