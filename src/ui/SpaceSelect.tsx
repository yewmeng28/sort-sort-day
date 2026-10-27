import { sortRooms } from '../domain/rooms';
import type { Room, Space } from '../domain/types';

interface Props {
  rooms: Room[];
  spaces: Space[];
  /** Placeholder option, e.g. "Found it in…". */
  prompt: string;
  label: string;
  onPick: (space: Space) => void;
  /** Leave this space out, e.g. where the item already is. */
  exclude?: string | null;
  className?: string;
}

/** Choose a space from any room, grouped by room (favourites first). Resets after each pick. */
export function SpaceSelect({ rooms, spaces, prompt, label, onPick, exclude, className }: Props) {
  return (
    <select
      className={className}
      aria-label={label}
      value=""
      onChange={(e) => {
        const space = spaces.find((s) => s.id === e.target.value);
        if (space) onPick(space);
      }}
    >
      <option value="">{prompt}</option>
      {sortRooms(rooms).map((r) => (
        <optgroup key={r.id} label={r.name}>
          {spaces
            .filter((s) => s.roomId === r.id && s.id !== exclude)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
