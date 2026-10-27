import { useState, type FormEvent } from 'react';
import { useAwardXp, useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { spaceLayers } from '../../domain/grid';
import { FREQUENCY_OPTIONS, frequencyLabel, fullnessText } from '../../domain/items';
import { XP } from '../../domain/progress';
import { fullness } from '../../domain/spaces';
import type { Item, Room, Space } from '../../domain/types';
import { Segmented, Stepper } from '../../ui/controls';
import { Sheet } from '../../ui/Sheet';
import { Swatches } from '../../ui/Swatches';
import { useToast } from '../../ui/Toast';
import { CategoryChips } from './CategoryChips';
import { ItemActions } from './ItemActions';

interface Props {
  space: Space;
  rooms: Room[];
  /** Every space in every room, so items can be moved between rooms. */
  spaces: Space[];
  items: Item[];
  onClose: () => void;
}

/** A chest: its items first, a pinned field to add more, and the space's own settings tucked away below. */
export function SpaceDetail({ space, rooms, spaces, items, onClose }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const toast = useToast();
  const room = rooms.find((r) => r.id === space.roomId)!;
  const [openId, setOpenId] = useState<string | null>(null);

  // Quick add. Category and frequency stay put between adds, so a batch of similar things is fast.
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState(1);
  const [useFrequency, setUseFrequency] = useState<Item['useFrequency']>(2);
  const [expanded, setExpanded] = useState(false);

  const here = items.filter((i) => i.spaceId === space.id && i.status === 'stored').sort((a, b) => a.name.localeCompare(b.name));
  const openItem = here.find((i) => i.id === openId);
  const { count, capacity, overfull } = fullness(space, items);
  const layerNames = spaceLayers(space).map((l) => room.layers[l]).join(' + ');

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await repos.items.save({
      id: crypto.randomUUID(),
      roomId: room.id,
      spaceId: space.id,
      name: name.trim(),
      qty,
      category: category.trim(),
      tags: [],
      useFrequency,
      status: 'stored',
      updatedAt: Date.now(),
    });
    await awardXp(XP.addItem);
    play('confirm');
    toast({ message: `Added ${name.trim()} · +${XP.addItem} XP` });
    setName('');
    setQty(1);
  };

  const setCapacity = (value: number | undefined) => void repos.spaces.save({ ...space, capacity: value });

  const close = () => {
    play('cancel');
    onClose();
  };

  const footer = (
    <form className="quick-add" onSubmit={add}>
      <div className="quick-add-row">
        <input
          aria-label="New item name"
          placeholder="Add an item…"
          value={name}
          onFocus={() => setExpanded(true)}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="primary" disabled={!name.trim()}>
          Add
        </button>
      </div>
      {expanded && (
        <div className="quick-add-more">
          <div className="field">
            <span className="field-label">Category</span>
            <CategoryChips value={category} onChange={setCategory} />
          </div>
          <div className="quick-add-split">
            <div className="field">
              <span className="field-label">Quantity</span>
              <Stepper value={qty} onChange={setQty} label="Quantity" />
            </div>
            <div className="field">
              <span className="field-label">How often do you use it?</span>
              <Segmented options={FREQUENCY_OPTIONS} value={useFrequency} onChange={setUseFrequency} label="How often do you use it?" />
            </div>
          </div>
          <button type="button" className="ghost" onClick={() => setExpanded(false)}>
            Hide details
          </button>
        </div>
      )}
    </form>
  );

  return (
    <>
      <Sheet title={space.name} onClose={close} footer={footer}>
        <div className="space-meta">
          <span className="hint">{layerNames}</span>
          {capacity !== undefined && (
            <div
              className={`meter${overfull ? ' over' : ''}`}
              role="meter"
              aria-label="How full"
              aria-valuemin={0}
              aria-valuemax={capacity}
              aria-valuenow={count}
            >
              <div className="meter-fill" style={{ width: `${Math.min(100, (100 * count) / Math.max(capacity, 1))}%` }} />
            </div>
          )}
          <span className={overfull ? 'error' : 'hint'}>{fullnessText(count, capacity)}</span>
        </div>

        {here.length ? (
          <ul className="tiles">
            {here.map((item) => (
              <li key={item.id}>
                <button
                  className={`tile${item.id === openId ? ' active' : ''}`}
                  aria-haspopup="dialog"
                  onClick={() => {
                    play('tick');
                    setOpenId(item.id);
                  }}
                >
                  <span className="tile-name">{item.name}</span>
                  <span className="tile-cat">{item.category || frequencyLabel(item.useFrequency)}</span>
                  <span className="badge" aria-label={`Quantity ${item.qty}`}>
                    {item.qty}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Nothing in here yet. Add the first item below.</p>
        )}

        <details className="settings">
          <summary>Space settings</summary>
          <div className="form-stack">
            <div className="field">
              <span className="field-label">Colour</span>
              <Swatches value={space.color} onChange={(color) => void repos.spaces.save({ ...space, color })} label={`${space.name} colour`} />
            </div>
            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  checked={capacity !== undefined}
                  onChange={(e) => setCapacity(e.target.checked ? Math.max(count, 1) : undefined)}
                />
                Limit how many kinds of item it holds
              </label>
              {capacity !== undefined && (
                <div className="row wrap">
                  <span>Holds up to</span>
                  <Stepper value={capacity} min={1} max={99} onChange={setCapacity} label="Capacity" />
                  <span>{capacity === 1 ? 'kind of item' : 'kinds of item'}</span>
                </div>
              )}
              <span className="hint">Counts different items, not quantities: 5 rolls of tape count as one.</span>
            </div>
          </div>
        </details>
      </Sheet>

      {openItem && <ItemActions key={openItem.id} item={openItem} rooms={rooms} spaces={spaces} onClose={() => setOpenId(null)} />}
    </>
  );
}
