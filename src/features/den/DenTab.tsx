import { useState, type ChangeEvent } from 'react';
import { useAwardXp, useCategories, useRepos } from '../../data/RepoContext';
import { Mascot } from '../../app/Mascot';
import { isMuted, play, setMuted } from '../../app/sound';
import { categoryNames, deleteCategory, renameCategory, type CategoryChange } from '../../domain/categories';
import { XP } from '../../domain/progress';
import { plural } from '../../domain/text';
import { moveItem, sortRooms } from '../../domain/rooms';
import { parseBackup } from '../../domain/backup';
import type { Item, Room, Space } from '../../domain/types';

interface Props {
  rooms: Room[];
  spaces: Space[];
  items: Item[];
}

export function DenTab({ rooms, spaces, items }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const [muted, setMutedState] = useState(isMuted());
  const [message, setMessage] = useState('');
  const lost = items.filter((i) => i.status === 'missing' || !i.spaceId);

  const place = async (item: Item, spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) return;
    await repos.items.save(moveItem(item, space, Date.now()));
    await awardXp(XP.findItem);
    play('confirm');
  };

  const savedCategories = useCategories();
  const categories = categoryNames(savedCategories ?? [], items);

  const applyCategoryChange = async (change: CategoryChange) => {
    await Promise.all(change.items.map((i) => repos.items.save(i)));
    await Promise.all(change.removeCategoryIds.map((id) => repos.categories.remove(id)));
    await Promise.all(change.saveCategories.map((c) => repos.categories.save(c)));
  };

  const rename = async (name: string) => {
    const next = window.prompt('Rename category', name);
    const change = next === null ? null : renameCategory(savedCategories ?? [], items, name, next, Date.now());
    if (!change) return;
    await applyCategoryChange(change);
    play('confirm');
  };

  const remove = async (name: string, count: number) => {
    const detail = count ? ` ${plural(count, 'item')} will become uncategorised.` : '';
    if (!window.confirm(`Delete category "${name}"?${detail}`)) return;
    await applyCategoryChange(deleteCategory(items, name, Date.now()));
    play('cancel');
  };

  const exportBackup = async () => {
    const blob = new Blob([JSON.stringify(await repos.backup.exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sort-sort-day-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !window.confirm('Replace everything with this backup?')) return;
    try {
      // Validate fully before importAll, which clears existing data first.
      const backup = parseBackup(JSON.parse(await file.text()));
      await repos.backup.importAll(backup);
      setMessage('Backup restored.');
    } catch (err) {
      setMessage(err instanceof SyntaxError ? 'That file is not valid JSON.' : err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  return (
    <section className="panel">
      <h2>The Den</h2>
      <div className="row empty">
        <Mascot size={64} label="Bandit the cat" />
        <p className="hint">Items Bandit the cat made off with, or that have no home yet.</p>
      </div>
      <ul className="results">
        {lost.map((item) => (
          <li key={item.id} className="row wrap">
            <span>{item.name} ×{item.qty}</span>
            <select aria-label={`Found ${item.name}`} value="" onChange={(e) => e.target.value && place(item, e.target.value)}>
              <option value="">Found it in…</option>
              {sortRooms(rooms).map((r) => (
                <optgroup key={r.id} label={r.name}>
                  {spaces.filter((s) => s.roomId === r.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
            <button className="danger" onClick={() => { void repos.items.remove(item.id); play('cancel'); }}>Gone for good</button>
          </li>
        ))}
        {!lost.length && <li className="hint">Nothing missing.</li>}
      </ul>

      <h2>Categories</h2>
      <ul className="results">
        {categories.map((name) => {
          const count = items.filter((i) => i.category.trim().toLowerCase() === name.toLowerCase()).length;
          return (
            <li key={name} className="row wrap">
              <span>{name} <span className="hint">({count})</span></span>
              <div className="row">
                <button onClick={() => void rename(name)}>Rename</button>
                <button className="danger" onClick={() => void remove(name, count)}>Delete</button>
              </div>
            </li>
          );
        })}
        {!categories.length && <li className="hint">No categories yet. Add them when adding an item.</li>}
      </ul>

      <h2>Camp</h2>
      <div className="row wrap">
        <button onClick={exportBackup}>Export backup</button>
        <label className="button">
          Import backup
          <input type="file" accept="application/json" hidden onChange={importBackup} />
        </label>
        <button onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? 'Sound off' : 'Sound on'}</button>
      </div>
      {message && <p className="hint">{message}</p>}
    </section>
  );
}
