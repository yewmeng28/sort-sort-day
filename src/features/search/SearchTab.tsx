import { useMemo, useState } from 'react';
import { useRepos } from '../../data/RepoContext';
import { Mascot } from '../../app/Mascot';
import { play } from '../../app/sound';
import { spaceLayers } from '../../domain/grid';
import { searchItems } from '../../domain/search';
import type { Item, Room, Space } from '../../domain/types';

interface Props {
  rooms: Room[];
  /** All spaces and items across every room. */
  spaces: Space[];
  items: Item[];
  onLocate: (space: Space) => void;
}

export function SearchTab({ rooms, spaces, items, onLocate }: Props) {
  const repos = useRepos();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  const where = (space: Space) => {
    const room = roomById.get(space.roomId);
    const layers = spaceLayers(space).map((l) => room?.layers[l]).join(' + ');
    return `${room?.name ?? 'Unknown room'} · ${space.name} · ${layers}`;
  };

  return (
    <section className="panel">
      <input
        type="search"
        placeholder="Where did I put…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <ul className="results">
        {results.map((item) => {
          const space = item.spaceId ? spaceById.get(item.spaceId) : undefined;
          return (
            <li key={item.id} className="row">
              <div>
                <strong>{item.name}</strong> ×{item.qty}
                <div className="hint">{item.status === 'missing' || !space ? 'Missing: check the Den' : where(space)}</div>
              </div>
              {space && item.status === 'stored' && (
                <div className="row">
                  <button onClick={() => { play('chest'); onLocate(space); }}>Show</button>
                  <button className="ghost" onClick={() => { void repos.items.save({ ...item, status: 'missing', spaceId: null, updatedAt: Date.now() }); play('sneak'); }}>
                    Not there
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {query && !results.length && (
          <li className="row empty">
            <Mascot size={48} />
            <span className="hint">Nothing found. Perhaps Bandit has it.</span>
          </li>
        )}
      </ul>
    </section>
  );
}
