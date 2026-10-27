import { useProgress } from '../../data/RepoContext';
import { DEFAULT_PROGRESS, effectiveStreak, levelProgress, localDay } from '../../domain/progress';
import { plural } from '../../domain/text';
import { FlameIcon } from '../../ui/icons';

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
  const progress = useProgress() ?? DEFAULT_PROGRESS;
  const { level, title, into, needed } = levelProgress(progress.xp);
  const streak = effectiveStreak(progress, localDay());
  const metGoalToday = progress.lastGoodDay === localDay();

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
        <span className="streak">
          <FlameIcon size={18} />
          <span>
            <strong>{streak}</strong>-day streak <span className="hint">(best {progress.bestStreak})</span>
          </span>
        </span>
        <span className="hint">
          Goal {progress.threshold}%{metGoalToday ? ' · met today' : ''}
        </span>
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
