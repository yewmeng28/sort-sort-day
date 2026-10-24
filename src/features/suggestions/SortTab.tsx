import { useMemo } from 'react';
import { useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { suggest } from '../../domain/suggestions';
import type { Item, Room, Space, Suggestion } from '../../domain/types';

interface Props {
  room: Room;
  spaces: Space[];
  items: Item[];
}

export function SortTab({ room, spaces, items }: Props) {
  const repos = useRepos();
  const suggestions = useMemo(() => suggest(spaces, items, room.layers.length), [spaces, items, room.layers.length]);

  const apply = async (s: Suggestion) => {
    const moving = items.filter((i) => s.itemIds.includes(i.id));
    await Promise.all(moving.map((i) => repos.items.save({ ...i, spaceId: s.toSpaceId, updatedAt: Date.now() })));
    play('confirm');
  };

  return (
    <section className="panel">
      <h2>Sort quests</h2>
      <ul className="results">
        {suggestions.map((s) => (
          <li key={s.id} className="row">
            <span>{s.message}</span>
            <button onClick={() => apply(s)}>Do it</button>
          </li>
        ))}
        {!suggestions.length && <li className="hint">Nothing to tidy. Add categories, capacities and how often you use things to get quests.</li>}
      </ul>
    </section>
  );
}
