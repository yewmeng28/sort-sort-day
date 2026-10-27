import { useMemo, useState, type FormEvent } from 'react';
import { useAwardXp, useCategories, useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { categoryNames } from '../../domain/categories';
import { XP } from '../../domain/progress';
import { spaceLayers } from '../../domain/grid';
import { moveItem, sortRooms } from '../../domain/rooms';
import type { Item, Room, Space } from '../../domain/types';
import { Sheet } from '../../ui/Sheet';
import { Swatches } from '../../ui/Swatches';

/** Sentinel option value; never stored as a category name. */
const NEW_CATEGORY = '__new__';

interface Props {
  space: Space;
  rooms: Room[];
  /** Every space in every room, so items can be moved between rooms. */
  spaces: Space[];
  items: Item[];
  onClose: () => void;
}

export function SpaceDetail({ space, rooms, spaces, items, onClose }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const room = rooms.find((r) => r.id === space.roomId)!;
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState(1);
  const [useFrequency, setUseFrequency] = useState<Item['useFrequency']>(2);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [draftCategory, setDraftCategory] = useState('');

  const savedCategories = useCategories();
  const categories = useMemo(() => categoryNames(savedCategories ?? [], items), [savedCategories, items]);

  const saveCategory = async () => {
    const trimmed = draftCategory.trim();
    if (trimmed) {
      const existing = categories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (!existing) await repos.categories.save({ id: trimmed.toLowerCase(), name: trimmed });
      setCategory(existing ?? trimmed);
      play('confirm');
    }
    setDraftCategory('');
    setAddingCategory(false);
  };

  const here = items.filter((i) => i.spaceId === space.id && i.status === 'stored');
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
    setName('');
    setQty(1);
  };

  const update = (item: Item, patch: Partial<Item>) => repos.items.save({ ...item, ...patch, updatedAt: Date.now() });

  const close = () => {
    play('cancel');
    onClose();
  };

  return (
    <Sheet title={space.name} onClose={close}>
        <p className="hint">{layerNames}</p>

        <Swatches value={space.color} onChange={(color) => void repos.spaces.save({ ...space, color })} label={`${space.name} colour`} />

        <label className="row">
          <span>Capacity (items)</span>
          <input
            type="number"
            min={0}
            value={space.capacity ?? ''}
            placeholder="none"
            onChange={(e) => repos.spaces.save({ ...space, capacity: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>

        <ul className="tiles">
          {here.map((item) => (
            <li key={item.id}>
              <button className="tile" onClick={() => { play('tick'); setOpenId(openId === item.id ? null : item.id); }}>
                <span className="tile-name">{item.name}</span>
                <span className="badge">{item.qty}</span>
                {item.category && <span className="tile-cat">{item.category}</span>}
              </button>
              {openId === item.id && (
                <div className="row wrap actions">
                  <button onClick={() => update(item, { qty: Math.max(1, item.qty - 1) })}>−</button>
                  <button onClick={() => update(item, { qty: item.qty + 1 })}>+</button>
                  <select
                    aria-label="Move to"
                    value=""
                    onChange={(e) => {
                      const target = spaces.find((s) => s.id === e.target.value);
                      if (target) {
                        void repos.items.save(moveItem(item, target, Date.now()));
                        void awardXp(XP.moveItem);
                        play('confirm');
                      }
                    }}
                  >
                    <option value="">Move to…</option>
                    {sortRooms(rooms).map((r) => (
                      <optgroup key={r.id} label={r.name}>
                        {spaces.filter((s) => s.roomId === r.id && s.id !== space.id).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button onClick={() => { void update(item, { status: 'missing', spaceId: null }); play('sneak'); }}>
                    Bandit took it
                  </button>
                  <button className="danger" onClick={() => { void repos.items.remove(item.id); play('cancel'); }}>Delete</button>
                </div>
              )}
            </li>
          ))}
          {!here.length && <li className="hint">Empty chest.</li>}
        </ul>

        <form className="add-form" onSubmit={add}>
          <input className="full" aria-label="Item name" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />

          {addingCategory ? (
            <input
              aria-label="New category"
              placeholder="New category"
              value={draftCategory}
              autoFocus
              onChange={(e) => setDraftCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void saveCategory();
                }
              }}
            />
          ) : (
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => (e.target.value === NEW_CATEGORY ? setAddingCategory(true) : setCategory(e.target.value))}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value={NEW_CATEGORY}>+ New category…</option>
            </select>
          )}
          <input aria-label="Quantity" type="number" inputMode="numeric" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />

          {addingCategory && (
            <div className="row full">
              <button type="button" onClick={saveCategory}>Save category</button>
              <button type="button" className="ghost" onClick={() => { setAddingCategory(false); setDraftCategory(''); }}>Cancel</button>
            </div>
          )}

          <select className="full" aria-label="How often used" value={useFrequency} onChange={(e) => setUseFrequency(Number(e.target.value) as Item['useFrequency'])}>
            <option value={1}>Rarely used</option>
            <option value={2}>Sometimes</option>
            <option value={3}>All the time</option>
          </select>
          <button type="submit" className="full primary">Add item</button>
        </form>
    </Sheet>
  );
}
