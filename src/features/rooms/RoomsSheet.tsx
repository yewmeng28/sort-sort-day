import { useState, type FormEvent } from 'react';
import { useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { clampGrid, DEFAULT_LAYERS, parseLayers, sortRooms } from '../../domain/rooms';
import type { Item, Room, Space } from '../../domain/types';

interface Props {
  rooms: Room[];
  spaces: Space[];
  items: Item[];
  currentId: string;
  onSelect: (roomId: string) => void;
  onClose: () => void;
}

export function RoomsSheet({ rooms, spaces, items, currentId, onSelect, onClose }: Props) {
  const repos = useRepos();
  const [name, setName] = useState('');
  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(5);
  const [layers, setLayers] = useState(DEFAULT_LAYERS.join(', '));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const room: Room = {
      id: crypto.randomUUID(),
      name: name.trim(),
      cols: clampGrid(cols, 6),
      rows: clampGrid(rows, 5),
      layers: parseLayers(layers),
    };
    await repos.rooms.save(room);
    play('confirm');
    setName('');
    onSelect(room.id);
  };

  const rename = async (room: Room) => {
    const next = window.prompt('Rename room', room.name)?.trim();
    if (!next) return;
    await repos.rooms.save({ ...room, name: next });
    play('confirm');
  };

  const toggleFavorite = async (room: Room) => {
    await repos.rooms.save({ ...room, favorite: !room.favorite });
    play('tick');
  };

  const remove = async (room: Room) => {
    const roomSpaces = spaces.filter((s) => s.roomId === room.id);
    const roomItems = items.filter((i) => i.roomId === room.id);
    const detail = `${roomSpaces.length} space(s) and ${roomItems.length} item(s) in it will be deleted.`;
    if (!window.confirm(`Delete "${room.name}"? ${detail}`)) return;
    await repos.spaces.apply({ remove: roomSpaces.map((s) => s.id) });
    await Promise.all(roomItems.map((i) => repos.items.remove(i.id)));
    await repos.rooms.remove(room.id);
    play('cancel');
  };

  return (
    <div className="modal" role="dialog" aria-label="Rooms">
      <section className="panel chest">
        <header className="row">
          <h2>Rooms</h2>
          <button onClick={() => { play('cancel'); onClose(); }}>Close</button>
        </header>

        <ul className="results">
          {sortRooms(rooms).map((room) => (
            <li key={room.id} className="row">
              <button className={`room-pick ${room.id === currentId ? 'active' : ''}`} onClick={() => { play('tick'); onSelect(room.id); }}>
                {room.name}
                <span className="hint">{room.cols}×{room.rows}, {room.layers.length} layer(s)</span>
              </button>
              <div className="row">
                <button aria-label={room.favorite ? 'Unfavourite' : 'Favourite'} aria-pressed={!!room.favorite} onClick={() => void toggleFavorite(room)}>
                  {room.favorite ? '★' : '☆'}
                </button>
                <button onClick={() => void rename(room)}>Rename</button>
                <button disabled={rooms.length < 2} onClick={() => void remove(room)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>

        <h3>Add a room</h3>
        <form className="add-form" onSubmit={add}>
          <input className="full" aria-label="Room name" placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="Layer names" placeholder="Layers, comma separated" value={layers} onChange={(e) => setLayers(e.target.value)} />
          <span className="hint">layers, low to high</span>
          <input aria-label="Columns" type="number" inputMode="numeric" min={1} max={20} value={cols} onChange={(e) => setCols(Number(e.target.value))} />
          <span className="hint">columns</span>
          <input aria-label="Rows" type="number" inputMode="numeric" min={1} max={20} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
          <span className="hint">rows</span>
          <button type="submit" className="full primary">Add room</button>
        </form>
      </section>
    </div>
  );
}
