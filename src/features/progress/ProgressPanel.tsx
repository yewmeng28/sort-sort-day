import { useState } from 'react';
import { useProgress, useRepos } from '../../data/RepoContext';
import { DEFAULT_PROGRESS, effectiveStreak, levelProgress, localDay } from '../../domain/progress';
import { plural } from '../../domain/text';

interface Props {
  score: { percent: number; misplaced: number; total: number };
}

function Bar({ percent, label, marker }: { percent: number; label: string; marker?: number }) {
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <div className="bar-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      {marker !== undefined && <div className="bar-marker" style={{ left: `${marker}%` }} aria-hidden />}
    </div>
  );
}

export function ProgressPanel({ score }: Props) {
  const repos = useRepos();
  const progress = useProgress() ?? DEFAULT_PROGRESS;
  const { level, title, into, needed } = levelProgress(progress.xp);
  const streak = effectiveStreak(progress, localDay());
  const metGoalToday = progress.lastGoodDay === localDay();

  // Edit a draft and only save on blur/Enter: saving per keystroke would briefly set e.g. 9% while typing 90,
  // which could count today towards the streak by accident.
  const [draft, setDraft] = useState<string | null>(null);
  const commitThreshold = () => {
    const value = Number(draft);
    setDraft(null);
    if (draft === null || draft.trim() === '' || !Number.isFinite(value)) return;
    const threshold = Math.min(100, Math.max(1, Math.round(value)));
    void repos.progress.update((p) => (p.threshold === threshold ? p : { ...p, threshold }));
  };

  return (
    <div className="progress">
      <div className="row">
        <strong>Packing score</strong>
        <span className="stat">{score.percent}%</span>
      </div>
      <Bar percent={score.percent} label="Packing score" marker={progress.threshold} />
      <p className="hint">
        {score.total === 0
          ? 'Add some items to start scoring.'
          : score.misplaced === 0
            ? 'Everything is where it belongs.'
            : `${score.misplaced} of ${plural(score.total, 'item')} ${score.misplaced === 1 ? 'is' : 'are'} lost or part of an open quest.`}
      </p>

      <div className="row wrap">
        <span>
          Streak: <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'} <span className="hint">(best {progress.bestStreak})</span>
          {metGoalToday && <span className="hint"> · goal met today</span>}
        </span>
        <label className="threshold">
          Goal
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            aria-label="Streak goal percent"
            value={draft ?? progress.threshold}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitThreshold}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
          %
        </label>
      </div>

      <div className="row">
        <strong>
          Level {level} · {title}
        </strong>
        <span className="hint">
          {into} / {needed} XP
        </span>
      </div>
      <Bar percent={(100 * into) / needed} label="Experience to next level" />
    </div>
  );
}
