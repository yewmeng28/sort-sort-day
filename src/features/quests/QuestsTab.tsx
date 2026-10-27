import { useMemo, useState } from 'react';
import { useAwardXp, useDismissals, useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { XP } from '../../domain/progress';
import { moveItem } from '../../domain/rooms';
import { suggest, suggestInterRoom } from '../../domain/suggestions';
import type { Item, Room, Space, Suggestion } from '../../domain/types';
import { GatherIcon, OverfullIcon, ReachIcon, RoomsIcon } from '../../ui/icons';
import { useToast } from '../../ui/Toast';
import { ProgressPanel } from '../progress/ProgressPanel';

interface Props {
  /** The room currently open on the map. */
  room: Room;
  rooms: Room[];
  /** All spaces and items across every room. */
  spaces: Space[];
  items: Item[];
  score: { percent: number; misplaced: number; total: number };
}

const KIND_ICON = { consolidate: GatherIcon, overfull: OverfullIcon, accessibility: ReachIcon, room: RoomsIcon };

const reward = (quest: Suggestion) => XP.questItem * quest.itemIds.length;

/** The quest you've started, remembered on this device so it survives switching tabs. */
const ACTIVE_KEY = 'ssd:activeQuest';

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* storage unavailable: the active quest just won't be remembered */
  }
}

interface CardProps {
  quest: Suggestion;
  /** The items the quest moves, in its order. */
  questItems: Item[];
  /** Where an item is now, e.g. "Chest of drawers". */
  whereIs: (item: Item) => string;
  /** Started and in progress: highlighted, with subquests and Complete quest / Abandon quest. */
  active?: boolean;
  onStart?: () => void;
  /** Move one item: a subquest. */
  onItemDone?: (item: Item) => void;
  onComplete?: () => void;
  onAbandon?: () => void;
  onSkip?: () => void;
  /** Given for a skipped quest, which shows Restore instead. */
  onRestore?: () => void;
}

/**
 * What to do, why it helps, which items it involves and what it's worth. Once started, each item is a subquest that
 * can be done on its own; quests are recalculated from where things are, so a part-done quest shows what's left.
 */
function QuestCard({ quest, questItems, whereIs, active, onStart, onItemDone, onComplete, onAbandon, onSkip, onRestore }: CardProps) {
  const Icon = KIND_ICON[quest.kind];
  const many = questItems.length > 1;
  return (
    <li className={`quest-card${onRestore ? ' skipped' : ''}${active ? ' active' : ''}`} aria-current={active ? 'step' : undefined}>
      <span className="quest-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <div className="quest-text">
        {active && <span className="quest-status">Quest in progress</span>}
        <span className="list-title">{quest.message}</span>
        <span className="list-meta">{quest.reason}</span>
      </div>

      {active && many ? (
        <ul className="subquests" aria-label="Subquests">
          {questItems.map((item) => (
            <li key={item.id} className="subquest">
              <span className="list-main">
                <span className="list-title">{item.name}</span>
                <span className="list-meta">From {whereIs(item)}</span>
              </span>
              <button onClick={() => onItemDone?.(item)} aria-label={`Done: move ${item.name}`}>
                Done
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !onRestore && (
          <ul className="quest-items" aria-label="Items in this quest">
            {questItems.map((item) => (
              <li key={item.id} className="item-chip">
                {item.name}
                <span className="qty"> · {whereIs(item)}</span>
              </li>
            ))}
          </ul>
        )
      )}

      {onRestore ? (
        <button onClick={onRestore}>Restore</button>
      ) : active ? (
        <div className="quest-actions">
          <span className="xp">+{reward(quest)} XP</span>
          <button className="primary" onClick={onComplete}>
            {many ? 'Complete all' : 'Complete quest'}
          </button>
          <button className="ghost" onClick={onAbandon}>
            Abandon quest
          </button>
        </div>
      ) : (
        <div className="quest-actions">
          <span className="xp">+{reward(quest)} XP</span>
          <button className="primary" onClick={onStart}>
            Start quest
          </button>
          <button className="ghost" onClick={onSkip}>
            Skip
          </button>
        </div>
      )}
    </li>
  );
}

export function QuestsTab({ room, rooms, spaces, items, score }: Props) {
  const repos = useRepos();
  const awardXp = useAwardXp();
  const toast = useToast();
  const dismissed = useDismissals();
  const [showSkipped, setShowSkipped] = useState(false);

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

  const [startedId, setStartedId] = useState<string | null>(readActive);

  const skippedIds = new Set((dismissed ?? []).map((d) => d.id));
  const split = (quests: Suggestion[]) => ({
    open: quests.filter((q) => !skippedIds.has(q.id)),
    skipped: quests.filter((q) => skippedIds.has(q.id)),
  });
  const inRoom = split(roomQuests);
  const between = split(crossQuests);
  const skippedCount = inRoom.skipped.length + between.skipped.length;
  // A started quest that no longer applies (done by hand, or skipped) simply stops being active.
  const activeId = [...inRoom.open, ...between.open].some((q) => q.id === startedId) ? startedId : null;

  const setActive = (id: string | null) => {
    setStartedId(id);
    writeActive(id);
  };

  const start = (quest: Suggestion) => {
    setActive(quest.id);
    play('chest');
    toast({ message: 'Quest started. Move the items, then complete it.' });
  };

  // Subquests already done were real moves, so they stay done; the quest recalculates to what's left.
  const abandon = () => {
    setActive(null);
    play('cancel');
    toast({ message: 'Quest abandoned. Finished parts stay done; the rest is still on the list.' });
  };

  /** One subquest: move a single item to the quest's target right away. */
  const completeItem = async (quest: Suggestion, item: Item) => {
    const target = spaces.find((s) => s.id === quest.toSpaceId);
    if (!target) return;
    await repos.items.save(moveItem(item, target, Date.now()));
    await awardXp(XP.questItem);
    const last = quest.itemIds.length === 1;
    if (last) setActive(null);
    play('confirm');
    toast({ message: last ? `Quest complete · +${XP.questItem} XP` : `Moved ${item.name} · +${XP.questItem} XP` });
  };

  const itemById = new Map(items.map((i) => [i.id, i]));
  const spaceName = (id: string | null) => spaces.find((s) => s.id === id)?.name ?? 'nowhere';
  const whereIs = (item: Item) => spaceName(item.spaceId);
  const itemsOf = (quest: Suggestion) => quest.itemIds.flatMap((id) => itemById.get(id) ?? []);

  const complete = async (quest: Suggestion) => {
    const target = spaces.find((s) => s.id === quest.toSpaceId);
    if (!target) return;
    const now = Date.now();
    const moving = items.filter((i) => quest.itemIds.includes(i.id));
    await Promise.all(moving.map((i) => repos.items.save(moveItem(i, target, now))));
    const xp = XP.questItem * moving.length;
    await awardXp(xp);
    setActive(null);
    play('confirm');
    toast({ message: `Quest complete · +${xp} XP` });
  };

  const skip = async (quest: Suggestion) => {
    await repos.dismissals.save({ id: quest.id, at: Date.now() });
    play('cancel');
    toast({ message: 'Quest skipped', action: { label: 'Undo', run: () => void repos.dismissals.remove(quest.id) } });
  };

  const restore = async (quest: Suggestion) => {
    await repos.dismissals.remove(quest.id);
    play('tick');
  };

  const section = (quests: Suggestion[], empty: string) =>
    quests.length ? (
      <ul className="list">
        {/* The quest in progress goes first. */}
        {[...quests]
          .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId))
          .map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              questItems={itemsOf(q)}
              whereIs={whereIs}
              active={q.id === activeId}
              onStart={() => start(q)}
              onItemDone={(item) => void completeItem(q, item)}
              onComplete={() => void complete(q)}
              onAbandon={abandon}
              onSkip={() => void skip(q)}
            />
          ))}
      </ul>
    ) : (
      <p className="hint">{empty}</p>
    );

  return (
    <section className="panel">
      <h2>Quests</h2>
      <ProgressPanel score={score} />

      <h3>In {room.name}</h3>
      {section(inRoom.open, 'Nothing to tidy here. Add categories, limits and how often you use things to get quests.')}

      <h3>Between rooms</h3>
      {section(between.open, 'No cross-room quests. They appear when a category is split across rooms and there is space to gather it.')}

      {skippedCount > 0 && (
        <>
          <button className="link" onClick={() => setShowSkipped(!showSkipped)}>
            {showSkipped ? 'Hide' : 'Show'} skipped quests ({skippedCount})
          </button>
          {showSkipped && (
            <ul className="list">
              {[...inRoom.skipped, ...between.skipped].map((q) => (
                <QuestCard key={q.id} quest={q} questItems={itemsOf(q)} whereIs={whereIs} onRestore={() => void restore(q)} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
