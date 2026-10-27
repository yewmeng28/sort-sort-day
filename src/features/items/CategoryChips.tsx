import { useMemo, useState } from 'react';
import { useCategories, useItems, useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { categoryNames } from '../../domain/categories';

interface Props {
  value: string;
  onChange: (category: string) => void;
}

/** Pick a category with one tap, or add a new one inline. Saved categories and ones already in use both appear. */
export function CategoryChips({ value, onChange }: Props) {
  const repos = useRepos();
  const saved = useCategories();
  const items = useItems();
  const categories = useMemo(() => categoryNames(saved ?? [], items ?? []), [saved, items]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const save = async () => {
    const name = draft.trim();
    if (name) {
      const existing = categories.find((c) => c.toLowerCase() === name.toLowerCase());
      if (!existing) await repos.categories.save({ id: name.toLowerCase(), name });
      onChange(existing ?? name);
      play('confirm');
    }
    setDraft('');
    setAdding(false);
  };

  const current = value.trim().toLowerCase();

  return (
    <div className="chips" role="radiogroup" aria-label="Category">
      <button type="button" role="radio" className="chip-btn" aria-checked={current === ''} onClick={() => onChange('')}>
        None
      </button>
      {categories.map((c) => (
        <button key={c} type="button" role="radio" className="chip-btn" aria-checked={c.toLowerCase() === current} onClick={() => onChange(c)}>
          {c}
        </button>
      ))}
      {adding ? (
        <span className="chip-new">
          <input
            aria-label="New category"
            placeholder="New category"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Don't submit a surrounding form.
              if (e.key === 'Enter') {
                e.preventDefault();
                void save();
              }
              if (e.key === 'Escape') {
                // Close just this field, not the sheet around it.
                e.stopPropagation();
                setAdding(false);
              }
            }}
          />
          <button type="button" onClick={() => void save()}>
            Add
          </button>
        </span>
      ) : (
        <button type="button" className="chip-btn ghost" onClick={() => setAdding(true)}>
          + New
        </button>
      )}
    </div>
  );
}
