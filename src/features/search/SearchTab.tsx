import { useMemo, useState } from 'react';
import { useAwardXp, useRepos } from '../../data/RepoContext';
import { Mascot } from '../../app/Mascot';
import { play } from '../../app/sound';
import { spaceLayers } from '../../domain/grid';
import { XP } from '../../domain/progress';
import { moveItem } from '../../domain/rooms';
import { searchItems } from '../../domain/search';
import { plural } from '../../domain/text';
import type { Item, Room, Space } from '../../domain/types';
import { MapIcon, SearchIcon } from '../../ui/icons';
import { SpaceSelect } from '../../ui/SpaceSelect';
import { useToast } from '../../ui/Toast';

interface Props {
  rooms: Room[];
  /** All spaces and items across every room. */
  spaces: Space[];
  items: Item[];
  onLocate: (space: Space) => void;
}

const RECENT = 6;

export function SearchTab({ rooms, spaces, items, onLocate }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const recent = useMemo(
    () => items.filter((i) => i.status === 'stored' && i.spaceId).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT),
    [items],
  );
  const missing = items.filter((i) => i.status === 'missing' || !i.spaceId).length;
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  const where = (space: Space) => {
    const room = roomById.get(space.roomId);
    const layers = spaceLayers(space).map((l) => room?.layers[l]).join(' + ');
    return `${room?.name ?? 'Unknown room'} · ${space.name} · ${layers}`;
  };

  const notThere = async (item: Item) => {
    await repos.items.save({ ...item, status: 'missing', spaceId: null, updatedAt: Date.now() });
    play('sneak');
    toast({ message: `${item.name} is in the Den now`, action: { label: 'Undo', run: () => void repos.items.save(item) } });
  };

  const foundIn = async (item: Item, space: Space) => {
    await repos.items.save(moveItem(item, space, Date.now()));
    await awardXp(XP.findItem);
    play('confirm');
    toast({ message: `Found ${item.name} · +${XP.findItem} XP` });
  };

  const list = searching ? results : recent;

  return (
    <section className="panel">
      <label className="search-box">
        <SearchIcon size={20} />
        <input type="search" placeholder="Where did I put…" aria-label="Search items" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </label>

      {!searching && (
        <>
          {missing > 0 && <p className="hint">{plural(missing, 'item')} missing. Look in the Den.</p>}
          {recent.length > 0 && <h3>Recently moved</h3>}
        </>
      )}

      <ul className="list">
        {list.map((item) => {
          const space = item.spaceId ? spaceById.get(item.spaceId) : undefined;
          const lost = item.status === 'missing' || !space;
          return (
            <li key={item.id} className="result">
              {lost ? (
                <>
                  <div className="list-row static">
                    <span className="list-main">
                      <span className="list-title">
                        {item.name} <span className="qty">×{item.qty}</span>
                      </span>
                      <span className="list-meta">Missing, in the Den</span>
                    </span>
                  </div>
                  <SpaceSelect
                    className="found-select"
                    rooms={rooms}
                    spaces={spaces}
                    prompt="Found it…"
                    label={`Found ${item.name} in`}
                    onPick={(s) => void foundIn(item, s)}
                  />
                </>
              ) : (
                <>
                  <button
                    className="list-row"
                    aria-label={`${item.name}: show ${space.name} on the map`}
                    onClick={() => {
                      play('chest');
                      onLocate(space);
                    }}
                  >
                    <span className="dot" style={{ background: space.color }} aria-hidden="true" />
                    <span className="list-main">
                      <span className="list-title">
                        {item.name} <span className="qty">×{item.qty}</span>
                      </span>
                      <span className="list-meta">{where(space)}</span>
                    </span>
                    <MapIcon size={18} />
                  </button>
                  <button className="ghost" onClick={() => void notThere(item)}>
                    Not there
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {searching && !results.length && (
        <div className="row empty">
          <Mascot size={48} />
          <span className="hint">Nothing found. Perhaps Bandit has it.</span>
        </div>
      )}
      {!searching && !recent.length && <p className="hint">Search for anything you've stored, in any room.</p>}
    </section>
  );
}
