import { useAwardXp, useRepos } from '../../data/RepoContext';
import { Mascot } from '../../app/Mascot';
import { play } from '../../app/sound';
import { XP } from '../../domain/progress';
import { moveItem } from '../../domain/rooms';
import type { Item, Room, Space } from '../../domain/types';
import { SpaceSelect } from '../../ui/SpaceSelect';
import { useToast } from '../../ui/Toast';

interface Props {
  rooms: Room[];
  spaces: Space[];
  items: Item[];
}

/** Bandit's stash: things marked missing, and things that lost their space when it was deleted. */
export function DenTab({ rooms, spaces, items }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const toast = useToast();
  const lost = items.filter((i) => i.status === 'missing' || !i.spaceId).sort((a, b) => b.updatedAt - a.updatedAt);

  const place = async (item: Item, space: Space) => {
    await repos.items.save(moveItem(item, space, Date.now()));
    await awardXp(XP.findItem);
    play('confirm');
    toast({ message: `${item.name} is back in ${space.name} · +${XP.findItem} XP` });
  };

  const goneForGood = async (item: Item) => {
    await repos.items.remove(item.id);
    play('cancel');
    toast({ message: `Removed ${item.name}`, action: { label: 'Undo', run: () => void repos.items.save(item) } });
  };

  return (
    <section className="panel">
      <h2>The Den</h2>
      <div className="row empty">
        <Mascot size={64} label="Bandit the cat" />
        <p className="hint">Things Bandit made off with, or that have no home yet. When one turns up, put it back.</p>
      </div>

      {lost.length ? (
        <ul className="list">
          {lost.map((item) => (
            <li key={item.id} className="den-card">
              <div className="list-main">
                <span className="list-title">
                  {item.name} <span className="qty">×{item.qty}</span>
                </span>
                <span className="list-meta">
                  {item.status === 'missing' ? 'Missing' : 'No home yet'}
                  {item.category && ` · ${item.category}`}
                </span>
              </div>
              <div className="toolbar-row">
                <SpaceSelect
                  className="found-select"
                  rooms={rooms}
                  spaces={spaces}
                  prompt="Found it in…"
                  label={`Found ${item.name} in`}
                  onPick={(s) => void place(item, s)}
                />
                <button className="ghost danger" onClick={() => void goneForGood(item)}>
                  Gone for good
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Nothing missing. Bandit is sulking.</p>
      )}
    </section>
  );
}
