import { spaceLayers } from '../../domain/grid';
import { fullness } from '../../domain/spaces';
import { plural } from '../../domain/text';
import type { Item, Room, Space } from '../../domain/types';

interface Props {
  room: Room;
  spaces: Space[];
  items: Item[];
  layer: number;
  onOpen: (spaceId: string) => void;
}

/** The spaces on this layer as a readable, tappable list: full names, counts and fullness the map can't fit. */
export function SpaceList({ room, spaces, items, layer, onOpen }: Props) {
  const here = spaces.filter((s) => s.cells.some((c) => c.layer === layer)).sort((a, b) => a.name.localeCompare(b.name));

  if (!here.length) return <p className="hint">No storage on the {room.layers[layer]} layer yet. Tap Edit to add some.</p>;

  return (
    <section className="space-list" aria-labelledby="space-list-title">
      <h3 id="space-list-title">On the {room.layers[layer]} layer</h3>
      <ul className="list">
        {here.map((s) => {
          const { count, capacity, overfull } = fullness(s, items);
          const layers = spaceLayers(s).map((l) => room.layers[l]).join(' + ');
          return (
            <li key={s.id}>
              <button className="list-row" onClick={() => onOpen(s.id)}>
                <span className="dot" style={{ background: s.color }} aria-hidden="true" />
                <span className="list-main">
                  <span className="list-title">{s.name}</span>
                  <span className="list-meta">
                    {plural(count, 'item')} · {layers}
                  </span>
                </span>
                {capacity !== undefined && (
                  <span className={`chip${overfull ? ' danger' : ''}`}>
                    {overfull ? 'Overfull · ' : ''}
                    {count} / {capacity}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
