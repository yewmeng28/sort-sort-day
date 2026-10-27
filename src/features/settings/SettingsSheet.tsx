import { useState, type ChangeEvent } from 'react';
import { useCategories, useItems, useProgress, useRepos } from '../../data/RepoContext';
import { Mascot } from '../../app/Mascot';
import { isMuted, play, setMuted } from '../../app/sound';
import { parseBackup } from '../../domain/backup';
import { categoryNames, deleteCategory, renameCategory, type CategoryChange } from '../../domain/categories';
import { DEFAULT_PROGRESS } from '../../domain/progress';
import { plural } from '../../domain/text';
import { Stepper } from '../../ui/controls';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';

/** App-wide settings: the streak goal, sound, categories and backups. */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const repos = useRepos();
  const toast = useToast();
  const items = useItems() ?? [];
  const savedCategories = useCategories() ?? [];
  const progress = useProgress() ?? DEFAULT_PROGRESS;
  const [muted, setMutedState] = useState(isMuted());
  const [backupMessage, setBackupMessage] = useState('');
  const categories = categoryNames(savedCategories, items);

  const setGoal = (threshold: number) => void repos.progress.update((p) => (p.threshold === threshold ? p : { ...p, threshold }));

  const applyCategoryChange = async (change: CategoryChange) => {
    await Promise.all(change.items.map((i) => repos.items.save(i)));
    await Promise.all(change.removeCategoryIds.map((id) => repos.categories.remove(id)));
    await Promise.all(change.saveCategories.map((c) => repos.categories.save(c)));
  };

  const renameCat = async (name: string) => {
    const next = window.prompt('Rename category', name);
    const change = next === null ? null : renameCategory(savedCategories, items, name, next, Date.now());
    if (!change) return;
    await applyCategoryChange(change);
    play('confirm');
  };

  const deleteCat = async (name: string, count: number) => {
    const detail = count ? ` ${plural(count, 'item')} will become uncategorised.` : '';
    if (!window.confirm(`Delete category "${name}"?${detail}`)) return;
    const before = items.filter((i) => i.category.trim().toLowerCase() === name.toLowerCase());
    const saved = savedCategories.find((c) => c.id === name.toLowerCase());
    await applyCategoryChange(deleteCategory(items, name, Date.now()));
    play('cancel');
    toast({
      message: `Deleted ${name}`,
      action: {
        label: 'Undo',
        run: () =>
          void applyCategoryChange({ saveCategories: saved ? [saved] : [], removeCategoryIds: [], items: before }),
      },
    });
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
      setBackupMessage('Backup restored.');
    } catch (err) {
      setBackupMessage(
        err instanceof SyntaxError ? 'That file is not valid JSON.' : err instanceof Error ? err.message : 'Could not read that file.',
      );
    }
  };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="form-stack">
        <section className="settings-section">
          <h3>Streak goal</h3>
          <div className="row wrap">
            <span>A day counts when the packing score reaches</span>
            <Stepper value={progress.threshold} min={10} max={100} step={5} suffix="%" onChange={setGoal} label="Streak goal" />
          </div>
        </section>

        <section className="settings-section">
          <h3>Sound</h3>
          <label className="check">
            <input
              type="checkbox"
              checked={!muted}
              onChange={() => {
                setMuted(!muted);
                setMutedState(!muted);
              }}
            />
            Play sounds
          </label>
        </section>

        <section className="settings-section">
          <h3>Categories</h3>
          {categories.length ? (
            <ul className="list">
              {categories.map((name) => {
                const count = items.filter((i) => i.category.trim().toLowerCase() === name.toLowerCase()).length;
                return (
                  <li key={name} className="settings-row">
                    <span className="list-main">
                      <span className="list-title">{name}</span>
                      <span className="list-meta">{plural(count, 'item')}</span>
                    </span>
                    <button className="ghost" onClick={() => void renameCat(name)}>
                      Rename
                    </button>
                    <button className="ghost danger" onClick={() => void deleteCat(name, count)}>
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="hint">No categories yet. Add them when adding an item.</p>
          )}
        </section>

        <section className="settings-section">
          <h3>Backup</h3>
          <p className="hint">Everything lives on this device. Export a backup now and then, and keep it somewhere safe.</p>
          <div className="toolbar-row">
            <button onClick={() => void exportBackup()}>Export backup</button>
            <label className="button">
              Import backup
              <input type="file" accept="application/json" className="sr-only" onChange={importBackup} />
            </label>
          </div>
          {backupMessage && (
            <p className="hint" role="status">
              {backupMessage}
            </p>
          )}
        </section>

        <section className="settings-section about">
          <Mascot size={48} />
          <div>
            <h3>Sort Sort Day</h3>
            <p className="hint">A slightly silly sorting system. Bandit the cat is not to be trusted.</p>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
