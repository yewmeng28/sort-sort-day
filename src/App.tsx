import { useEffect, useState } from 'react';
import { useItems, useRepos, useRooms, useSpaces } from './data/RepoContext';
import { play } from './app/sound';
import { DenTab } from './features/den/DenTab';
import { SpaceDetail } from './features/items/SpaceDetail';
import { MapEditor } from './features/map/MapEditor';
import { SearchTab } from './features/search/SearchTab';
import { SortTab } from './features/suggestions/SortTab';
import type { Room } from './domain/types';

type Tab = 'map' | 'search' | 'sort' | 'den';

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'search', label: 'Search' },
  { id: 'sort', label: 'Sort' },
  { id: 'den', label: 'Den' },
];

const DEFAULT_ROOM: Room = { id: 'default', name: 'My room', cols: 6, rows: 5, layers: ['Floor', 'Mid', 'High'] };

export default function App() {
  const repos = useRepos();
  const rooms = useRooms();
  const spaces = useSpaces();
  const items = useItems();
  const [tab, setTab] = useState<Tab>('map');
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

  const room = rooms?.[0];
  if (!room || !spaces || !items) return <p className="hint center">Opening the Item Box…</p>;

  const openSpace = spaces.find((s) => s.id === openSpaceId);

  return (
    <div className="app">
      <header className="title">
        <h1>Sort Sort Day</h1>
        <span className="hint">{room.name}</span>
      </header>

      <main>
        {tab === 'map' && (
          <MapEditor room={room} spaces={spaces} items={items} highlightSpaceId={highlightId} onOpenSpace={setOpenSpaceId} />
        )}
        {tab === 'search' && (
          <SearchTab
            room={room}
            spaces={spaces}
            items={items}
            onLocate={(id) => {
              setHighlightId(id);
              setTab('map');
            }}
          />
        )}
        {tab === 'sort' && <SortTab room={room} spaces={spaces} items={items} />}
        {tab === 'den' && <DenTab spaces={spaces} items={items} />}
      </main>

      {openSpace && (
        <SpaceDetail space={openSpace} room={room} spaces={spaces} items={items} onClose={() => setOpenSpaceId(null)} />
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
