import { useMemo, useState } from 'react';
import { useAwardXp, useDismissals, useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { XP } from '../../domain/progress';
import { moveItem } from '../../domain/rooms';
import { ProgressPanel } from '../progress/ProgressPanel';
import { suggest, suggestInterRoom } from '../../domain/suggestions';
import type { Item, Room, Space, Suggestion } from '../../domain/types';

interface Props {
  /** The room currently open on the map. */
  room: Room;
  rooms: Room[];
  /** All spaces and items across every room. */
  spaces: Space[];
  items: Item[];
  score: { percent: number; misplaced: number; total: number };
}

export function QuestsTab({ room, rooms, spaces, items, score }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const dismissed = useDismissals();
  const [showCancelled, setShowCancelled] = useState(false);

  const roomQuests = useMemo(
    () =>
      suggest(
        room.id,
        spaces.filter((s) => s.roomId === room.id),
        items.filter((i) => i.roomId === room.id),
        room.layers.length,
      ),
    [room, spaces, items],
  );
  const crossQuests = useMemo(() => suggestInterRoom(rooms, spaces, items), [rooms, spaces, items]);

  const cancelledIds = new Set((dismissed ?? []).map((d) => d.id));
  const split = (quests: Suggestion[]) => ({
    active: quests.filter((q) => !cancelledIds.has(q.id)),
    cancelled: quests.filter((q) => cancelledIds.has(q.id)),
  });
  const inRoom = split(roomQuests);
  const between = split(crossQuests);
  const cancelledCount = inRoom.cancelled.length + between.cancelled.length;

  const apply = async (quest: Suggestion) => {
    const target = spaces.find((s) => s.id === quest.toSpaceId);
    if (!target) return;
    const now = Date.now();
    const moving = items.filter((i) => quest.itemIds.includes(i.id));
    await Promise.all(moving.map((i) => repos.items.save(moveItem(i, target, now))));
    await awardXp(XP.questItem * moving.length);
    play('confirm');
  };

  const cancel = async (quest: Suggestion) => {
    await repos.dismissals.save({ id: quest.id, at: Date.now() });
    play('cancel');
  };

  const restore = async (quest: Suggestion) => {
    await repos.dismissals.remove(quest.id);
    play('tick');
  };

  const renderActive = (quests: Suggestion[], empty: string) => (
    <ul className="results">
      {quests.map((q) => (
        <li key={q.id} className="row quest">
          <span>{q.message}</span>
          <div className="row">
            <button className="primary" onClick={() => void apply(q)}>Do it</button>
            <button className="ghost" aria-label="Cancel quest" onClick={() => void cancel(q)}>Cancel</button>
          </div>
        </li>
      ))}
      {!quests.length && <li className="hint">{empty}</li>}
    </ul>
  );

  return (
    <section className="panel">
      <h2>Quests</h2>
      <ProgressPanel score={score} />

      <h3>In {room.name}</h3>
      {renderActive(inRoom.active, 'Nothing to tidy here. Add categories, capacities and how often you use things to get quests.')}

      <h3>Between rooms</h3>
      {renderActive(between.active, 'No cross-room quests. They appear when a category is split across rooms and there is space to gather it.')}

      {cancelledCount > 0 && (
        <>
          <button className="link" onClick={() => setShowCancelled(!showCancelled)}>
            {showCancelled ? 'Hide' : 'Show'} cancelled quests ({cancelledCount})
          </button>
          {showCancelled && (
            <ul className="results">
              {[...inRoom.cancelled, ...between.cancelled].map((q) => (
                <li key={q.id} className="row quest cancelled">
                  <span>{q.message}</span>
                  <button onClick={() => void restore(q)}>Restore</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
