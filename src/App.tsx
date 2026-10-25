import { useEffect, useState } from 'react';
import { useItems, useRepos, useRooms, useSpaces } from './data/RepoContext';
import { play } from './app/sound';
import { DenTab } from './features/den/DenTab';
import { SpaceDetail } from './features/items/SpaceDetail';
import { MapEditor } from './features/map/MapEditor';
import { QuestsTab } from './features/quests/QuestsTab';
import { RoomsSheet } from './features/rooms/RoomsSheet';
import { SearchTab } from './features/search/SearchTab';
import { DEFAULT_LAYERS, sortRooms } from './domain/rooms';
import type { Room } from './domain/types';

type Tab = 'map' | 'search' | 'quests' | 'den';

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'search', label: 'Search' },
  { id: 'quests', label: 'Quests' },
  { id: 'den', label: 'Den' },
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
  const [tab, setTab] = useState<Tab>('map');
  const [roomId, setRoomId] = useState<string | null>(readRoomId);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // First run: create the default room.
  useEffect(() => {
    if (rooms && rooms.length === 0) void repos.rooms.save(DEFAULT_ROOM);
  }, [rooms, repos]);

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

  if (!rooms?.length || !spaces || !items) return <p className="hint center">Opening the Item Box…</p>;

  // Fall back to the first room if the remembered one no longer exists.
  const room = rooms.find((r) => r.id === roomId) ?? sortRooms(rooms)[0];
  const roomSpaces = spaces.filter((s) => s.roomId === room.id);
  const roomItems = items.filter((i) => i.roomId === room.id);
  const openSpace = spaces.find((s) => s.id === openSpaceId);

  return (
    <div className="app">
      <header className="title">
        <h1>Sort Sort Day</h1>
        <button className="room-switch" aria-label="Switch room" onClick={() => { play('tick'); setRoomsOpen(true); }}>
          {room.favorite && '★ '}
          {room.name} ▾
        </button>
      </header>

      <main>
        {tab === 'map' && (
          <MapEditor
            key={room.id}
            room={room}
            spaces={roomSpaces}
            items={roomItems}
            highlightSpaceId={highlightId}
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
        {tab === 'quests' && <QuestsTab room={room} rooms={rooms} spaces={spaces} items={items} />}
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

      <nav className="bottom-nav" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'active' : ''}
            onClick={() => {
              play('tick');
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
