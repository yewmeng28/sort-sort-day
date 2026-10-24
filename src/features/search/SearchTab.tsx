import { useMemo, useState } from 'react';
import { useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { spaceLayers } from '../../domain/grid';
import { searchItems } from '../../domain/search';
import type { Item, Room, Space } from '../../domain/types';

interface Props {
  room: Room;
  spaces: Space[];
  items: Item[];
  onLocate: (spaceId: string) => void;
}

export function SearchTab({ room, spaces, items, onLocate }: Props) {
  const repos = useRepos();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const spaceById = new Map(spaces.map((s) => [s.id, s]));

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
                <div className="hint">
                  {item.status === 'missing' || !space
                    ? 'Missing: check the Den'
                    : `${space.name} · ${spaceLayers(space).map((l) => room.layers[l]).join(' + ')}`}
                </div>
              </div>
              {space && item.status === 'stored' && (
                <div className="row">
                  <button onClick={() => { play('chest'); onLocate(space.id); }}>Show</button>
                  <button onClick={() => { void repos.items.save({ ...item, status: 'missing', spaceId: null, updatedAt: Date.now() }); play('sneak'); }}>
                    Not there
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {query && !results.length && <li className="hint">Nothing found. Perhaps the Melynx has it.</li>}
      </ul>
    </section>
  );
}
