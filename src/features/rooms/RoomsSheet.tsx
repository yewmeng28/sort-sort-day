import { useState } from 'react';
import { useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { sortRooms } from '../../domain/rooms';
import { plural } from '../../domain/text';
import type { Item, Room, Space } from '../../domain/types';
import { StarIcon } from '../../ui/icons';
import { Sheet } from '../../ui/Sheet';
import { RoomEditor } from './RoomEditor';

interface Props {
  rooms: Room[];
  spaces: Space[];
  items: Item[];
  currentId: string;
  onSelect: (roomId: string) => void;
  onClose: () => void;
}

/** Switch rooms with one tap; favourite, edit or add rooms from here. */
export function RoomsSheet({ rooms, spaces, items, currentId, onSelect, onClose }: Props) {
  const repos = useRepos();
  // A room being edited, 'new' for the add form, or null.
  const [editing, setEditing] = useState<Room | 'new' | null>(null);

  const toggleFavorite = async (room: Room) => {
    await repos.rooms.save({ ...room, favorite: !room.favorite });
    play('tick');
  };

  const close = () => {
    play('cancel');
    onClose();
  };

  return (
    <>
      <Sheet title="Rooms" onClose={close}>
        <ul className="list">
          {sortRooms(rooms).map((room) => {
            const count = items.filter((i) => i.roomId === room.id).length;
            return (
              <li key={room.id} className="room-row">
                <button
                  className={`icon-btn ghost star${room.favorite ? ' on' : ''}`}
                  aria-label={room.favorite ? `Unfavourite ${room.name}` : `Favourite ${room.name}`}
                  aria-pressed={!!room.favorite}
                  onClick={() => void toggleFavorite(room)}
                >
                  {room.favorite ? <StarIcon /> : <StarIcon fill="none" stroke="currentColor" strokeWidth={1.8} />}
                </button>
                <button
                  className={`list-row room-pick${room.id === currentId ? ' active' : ''}`}
                  aria-current={room.id === currentId ? 'true' : undefined}
                  onClick={() => {
                    play('tick');
                    onSelect(room.id);
                    onClose();
                  }}
                >
                  <span className="list-main">
                    <span className="list-title">{room.name}</span>
                    <span className="list-meta">
                      {plural(count, 'item')} · {room.cols} × {room.rows} · {plural(room.layers.length, 'layer')}
                    </span>
                  </span>
                </button>
                <button className="ghost" onClick={() => setEditing(room)}>
                  Edit
                </button>
              </li>
            );
          })}
        </ul>
        <button className="primary add-room" onClick={() => setEditing('new')}>
          Add a room
        </button>
      </Sheet>

      {editing && (
        <RoomEditor
          room={editing === 'new' ? undefined : editing}
          roomCount={rooms.length}
          spaces={spaces}
          items={items}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            if (editing === 'new') {
              onSelect(id);
              onClose();
            }
          }}
        />
      )}
    </>
  );
}
