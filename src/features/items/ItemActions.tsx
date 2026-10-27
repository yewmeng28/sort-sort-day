import { useState } from 'react';
import { useAwardXp, useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { FREQUENCY_OPTIONS } from '../../domain/items';
import { XP } from '../../domain/progress';
import { moveItem, sortRooms } from '../../domain/rooms';
import type { Item, Room, Space } from '../../domain/types';
import { Segmented, Stepper } from '../../ui/controls';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { CategoryChips } from './CategoryChips';

interface Props {
  item: Item;
  rooms: Room[];
  /** Every space in every room, so the item can move between rooms. */
  spaces: Space[];
  onClose: () => void;
}

/** Everything you can do to one item, in a sheet over the chest. Changes save as you make them. */
export function ItemActions({ item, rooms, spaces, onClose }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const toast = useToast();
  const [name, setName] = useState(item.name);

  const update = (patch: Partial<Item>) => repos.items.save({ ...item, ...patch, updatedAt: Date.now() });

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== item.name) void update({ name: trimmed });
    else setName(item.name);
  };

  const moveTo = async (spaceId: string) => {
    const target = spaces.find((s) => s.id === spaceId);
    if (!target) return;
    await repos.items.save(moveItem(item, target, Date.now()));
    await awardXp(XP.moveItem);
    play('confirm');
    toast({ message: `Moved ${item.name} to ${target.name} · +${XP.moveItem} XP`, action: { label: 'Undo', run: () => void repos.items.save(item) } });
    onClose();
  };

  const banditTookIt = async () => {
    await update({ status: 'missing', spaceId: null });
    play('sneak');
    toast({ message: `${item.name} is in the Den now`, action: { label: 'Undo', run: () => void repos.items.save(item) } });
    onClose();
  };

  const remove = async () => {
    await repos.items.remove(item.id);
    play('cancel');
    toast({ message: `Deleted ${item.name}`, action: { label: 'Undo', run: () => void repos.items.save(item) } });
    onClose();
  };

  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="form-stack">
        <label className="field">
          <span className="field-label">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </label>

        <div className="field">
          <span className="field-label">Quantity</span>
          <Stepper value={item.qty} onChange={(qty) => void update({ qty })} label="Quantity" />
        </div>

        <div className="field">
          <span className="field-label">Category</span>
          <CategoryChips value={item.category} onChange={(category) => void update({ category })} />
        </div>

        <div className="field">
          <span className="field-label">How often do you use it?</span>
          <Segmented
            options={FREQUENCY_OPTIONS}
            value={item.useFrequency}
            onChange={(useFrequency) => void update({ useFrequency })}
            label="How often do you use it?"
          />
        </div>

        <label className="field">
          <span className="field-label">Move to</span>
          <select value="" onChange={(e) => void moveTo(e.target.value)}>
            <option value="">Choose a space…</option>
            {sortRooms(rooms).map((r) => (
              <optgroup key={r.id} label={r.name}>
                {spaces
                  .filter((s) => s.roomId === r.id && s.id !== item.spaceId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="toolbar-row">
          <button onClick={() => void banditTookIt()}>Bandit took it</button>
          <button className="danger" onClick={() => void remove()}>
            Delete item
          </button>
        </div>
      </div>
    </Sheet>
  );
}
