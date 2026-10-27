import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useDismissals, useItems, useProgress, useRepos, useRooms, useSpaces } from './data/RepoContext';
import {
  allQuests,
  effectiveStreak,
  levelFromXp,
  levelProgress,
  localDay,
  packingScore,
  recordDay,
  xpForLevel,
} from './domain/progress';
import { SettingsSheet } from './features/settings/SettingsSheet';
import { Sheet } from './ui/Sheet';
import { Mascot } from './app/Mascot';
import { play } from './app/sound';
import { DenTab } from './features/den/DenTab';
import { SpaceDetail } from './features/items/SpaceDetail';
import { MapEditor } from './features/map/MapEditor';
import { QuestsTab } from './features/quests/QuestsTab';
import { RoomsSheet } from './features/rooms/RoomsSheet';
import { SearchTab } from './features/search/SearchTab';
import { DEFAULT_LAYERS, sortRooms } from './domain/rooms';
import type { Room } from './domain/types';
import { ChevronDownIcon, DenIcon, FlameIcon, GearIcon, MapIcon, QuestIcon, SearchIcon, StarIcon } from './ui/icons';

type Tab = 'map' | 'search' | 'quests' | 'den';

const TABS: { id: Tab; label: string; Icon: (props: { size?: number }) => ReactElement }[] = [
  { id: 'map', label: 'Map', Icon: MapIcon },
  { id: 'search', label: 'Search', Icon: SearchIcon },
  { id: 'quests', label: 'Quests', Icon: QuestIcon },
  { id: 'den', label: 'Den', Icon: DenIcon },
];

const DEFAULT_ROOM: Room = { id: 'default', name: 'My room', cols: 6, rows: 5, layers: DEFAULT_LAYERS };

const ROOM_KEY = 'ssd:room';

function readRoomId(): string | null {
  try {
    return localStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}

function writeRoomId(id: string) {
  try {
    localStorage.setItem(ROOM_KEY, id);
  } catch {
    /* storage unavailable: the choice just won't be remembered */
  }
}

export default function App() {
  const repos = useRepos();
  const rooms = useRooms();
  const spaces = useSpaces();
  const items = useItems();
  const dismissed = useDismissals();
  const progress = useProgress();
  const threshold = progress?.threshold;
  const [tab, setTab] = useState<Tab>('map');
  const [roomId, setRoomId] = useState<string | null>(readRoomId);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Celebrate when XP crosses into a new level (not on first load).
  const level = progress ? levelFromXp(progress.xp) : null;
  const lastLevel = useRef<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  useEffect(() => {
    if (level === null) return;
    if (lastLevel.current !== null && level > lastLevel.current) {
      setLevelUp(level);
      play('chest');
    }
    lastLevel.current = level;
  }, [level]);
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // First run: create the default room.
  useEffect(() => {
    if (rooms && rooms.length === 0) void repos.rooms.save(DEFAULT_ROOM);
  }, [rooms, repos]);

  const progressView = useMemo(() => {
    if (!rooms || !spaces || !items) return undefined;
    const cancelled = new Set((dismissed ?? []).map((d) => d.id));
    const quests = allQuests(rooms, spaces, items);
    return {
      score: packingScore(items, quests, cancelled),
      openQuests: quests.filter((q) => !cancelled.has(q.id)).length,
    };
  }, [rooms, spaces, items, dismissed]);
  const score = progressView?.score;

  // Count today towards the streak whenever the score reaches the goal. recordDay is idempotent per day,
  // and an empty inventory never counts.
  useEffect(() => {
    if (!score || score.total === 0) return;
    void repos.progress.update((p) => recordDay(p, localDay(), score.percent));
  }, [score, threshold, repos]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const selectRoom = (id: string) => {
    setRoomId(id);
    writeRoomId(id);
    setOpenSpaceId(null);
    setHighlightId(null);
  };

  if (!rooms?.length || !spaces || !items || !score) return <p className="hint center">Opening the Item Box…</p>;

  // Fall back to the first room if the remembered one no longer exists.
  const room = rooms.find((r) => r.id === roomId) ?? sortRooms(rooms)[0];
  const roomSpaces = spaces.filter((s) => s.roomId === room.id);
  const roomItems = items.filter((i) => i.roomId === room.id);
  const openSpace = spaces.find((s) => s.id === openSpaceId);
  const missing = items.filter((i) => i.status === 'missing' || !i.spaceId).length;
  const streak = progress ? effectiveStreak(progress, localDay()) : 0;
  const badges: Partial<Record<Tab, { count: number; label: string; alert?: boolean }>> = {
    quests: { count: progressView?.openQuests ?? 0, label: 'open' },
    den: { count: missing, label: 'missing', alert: true },
  };

  return (
    <div className="app">
      <header className="app-bar">
        <Mascot size={32} />
        <h1 className="app-bar-title">
          <button
            className="room-switch"
            aria-haspopup="dialog"
            aria-label={`${room.name}. Switch room`}
            onClick={() => {
              play('tick');
              setRoomsOpen(true);
            }}
          >
            {room.favorite && <StarIcon size={18} />}
            <span className="room-name">{room.name}</span>
            <ChevronDownIcon size={20} />
          </button>
        </h1>
        {progress && (
          <button
            className="xp-chip"
            aria-label={`Level ${level}, ${streak}-day streak. Open quests`}
            onClick={() => {
              play('tick');
              setTab('quests');
            }}
          >
            <span>Lv {level}</span>
            <FlameIcon size={15} />
            <span>{streak}</span>
          </button>
        )}
        <button
          className="icon-btn ghost on-dark"
          aria-label="Settings"
          onClick={() => {
            play('tick');
            setSettingsOpen(true);
          }}
        >
          <GearIcon />
        </button>
      </header>

      <main>
        {tab === 'map' && (
          <MapEditor
            // Reset selection and layer when the room or its shape changes.
            key={`${room.id}:${room.cols}x${room.rows}:${room.layers.length}`}
            room={room}
            spaces={roomSpaces}
            items={roomItems}
            highlightSpaceId={highlightId}
            firstRun={spaces.length === 0 && items.length === 0}
            onOpenSpace={setOpenSpaceId}
          />
        )}
        {tab === 'search' && (
          <SearchTab
            rooms={rooms}
            spaces={spaces}
            items={items}
            onLocate={(space) => {
              selectRoom(space.roomId);
              setHighlightId(space.id);
              setTab('map');
            }}
          />
        )}
        {tab === 'quests' && <QuestsTab room={room} rooms={rooms} spaces={spaces} items={items} score={score} />}
        {tab === 'den' && <DenTab rooms={rooms} spaces={spaces} items={items} />}
      </main>

      {openSpace && (
        <SpaceDetail
          space={openSpace}
          rooms={rooms}
          spaces={spaces}
          items={items}
          onClose={() => setOpenSpaceId(null)}
        />
      )}

      {roomsOpen && (
        <RoomsSheet
          rooms={rooms}
          spaces={spaces}
          items={items}
          currentId={room.id}
          onSelect={selectRoom}
          onClose={() => setRoomsOpen(false)}
        />
      )}

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      {levelUp !== null && (
        <Sheet title="Level up!" onClose={() => setLevelUp(null)}>
          <div className="level-up">
            <Mascot size={96} />
            <p className="stat">Level {levelUp}</p>
            <p>
              You're now a <b>{levelProgress(xpForLevel(levelUp)).title}</b>. Bandit is mildly impressed.
            </p>
            <button className="primary" onClick={() => setLevelUp(null)}>
              Nice
            </button>
          </div>
        </Sheet>
      )}

      <nav className="bottom-nav" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => {
          const badge = badges[id];
          const count = badge?.count ?? 0;
          return (
            <button
              key={id}
              className={id === tab ? 'active' : ''}
              aria-current={id === tab ? 'page' : undefined}
              aria-label={count ? `${label}, ${count} ${badge!.label}` : label}
              onClick={() => {
                play('tick');
                setTab(id);
              }}
            >
              <span className="tab-icon">
                <Icon size={24} />
                {count > 0 && (
                  <span className={`tab-badge${badge!.alert ? ' alert' : ''}`} aria-hidden="true">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
