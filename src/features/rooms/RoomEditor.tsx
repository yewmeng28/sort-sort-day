import { useState } from 'react';
import { useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import { DEFAULT_LAYERS, editRoom, parseLayers } from '../../domain/rooms';
import { plural } from '../../domain/text';
import type { Item, Room, Space } from '../../domain/types';
import { Stepper } from '../../ui/controls';
import { CloseIcon } from '../../ui/icons';
import { Sheet } from '../../ui/Sheet';

const MAX_LAYERS = 6;
const MAX_GRID = 20;

interface Props {
  /** The room to edit, or undefined to add a new one. */
  room?: Room;
  roomCount: number;
  spaces: Space[];
  items: Item[];
  onClose: () => void;
  onSaved: (roomId: string) => void;
}

/** Small picture of the grid; cells already used by storage are filled, and any that would fall outside turn red. */
function Preview({ cols, rows, room, spaces }: { cols: number; rows: number; room?: Room; spaces: Space[] }) {
  const used = new Map<string, string>();
  if (room) for (const s of spaces.filter((sp) => sp.roomId === room.id)) for (const c of s.cells) used.set(`${c.x},${c.y}`, s.color);
  const w = Math.max(cols, room?.cols ?? 0);
  const h = Math.max(rows, room?.rows ?? 0);
  const size = Math.max(6, Math.min(16, Math.floor(200 / Math.max(w, h))));
  const cells = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = x < cols && y < rows;
      const colour = used.get(`${x},${y}`);
      if (!inside && !colour) continue;
      cells.push(
        <rect
          key={`${x},${y}`}
          x={x * size + 0.5}
          y={y * size + 0.5}
          width={size - 1}
          height={size - 1}
          rx={1.5}
          className={inside ? 'preview-cell' : 'preview-cell outside'}
          style={colour && inside ? { fill: colour } : undefined}
        />,
      );
    }
  }
  return (
    <svg className="room-preview" width={w * size + 1} height={h * size + 1} role="img" aria-label={`${cols} by ${rows} grid`}>
      {cells}
    </svg>
  );
}

export function RoomEditor({ room, roomCount, spaces, items, onClose, onSaved }: Props) {
  const repos = useRepos();
  const [name, setName] = useState(room?.name ?? '');
  const [cols, setCols] = useState(room?.cols ?? 6);
  const [rows, setRows] = useState(room?.rows ?? 5);
  const [layers, setLayers] = useState<string[]>(room?.layers ?? [...DEFAULT_LAYERS]);
  const [error, setError] = useState('');

  const save = async () => {
    const cleanLayers = parseLayers(layers.join(','));
    let saved: Room;
    if (room) {
      const result = editRoom(room, spaces, { name, cols, rows, layers: cleanLayers });
      if (!result.ok) {
        setError(result.error);
        play('cancel');
        return;
      }
      saved = result.value;
    } else {
      if (!name.trim()) {
        setError('Give the room a name.');
        play('cancel');
        return;
      }
      saved = { id: crypto.randomUUID(), name: name.trim(), cols, rows, layers: cleanLayers };
    }
    await repos.rooms.save(saved);
    play('confirm');
    onSaved(saved.id);
    onClose();
  };

  const remove = async () => {
    if (!room) return;
    const roomSpaces = spaces.filter((s) => s.roomId === room.id);
    const roomItems = items.filter((i) => i.roomId === room.id);
    const detail = `Its ${plural(roomSpaces.length, 'space')} and ${plural(roomItems.length, 'item')} will be deleted too.`;
    if (!window.confirm(`Delete "${room.name}"? ${detail}`)) return;
    await repos.spaces.apply({ remove: roomSpaces.map((s) => s.id) });
    await Promise.all(roomItems.map((i) => repos.items.remove(i.id)));
    await repos.rooms.remove(room.id);
    play('cancel');
    onClose();
  };

  return (
    <Sheet title={room ? `Edit ${room.name}` : 'Add a room'} onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} placeholder="e.g. Study" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="room-size">
          <div className="field">
            <span className="field-label">Columns</span>
            <Stepper value={cols} min={1} max={MAX_GRID} onChange={setCols} label="Columns" />
          </div>
          <div className="field">
            <span className="field-label">Rows</span>
            <Stepper value={rows} min={1} max={MAX_GRID} onChange={setRows} label="Rows" />
          </div>
          <Preview cols={cols} rows={rows} room={room} spaces={spaces} />
        </div>

        <div className="field">
          <span className="field-label">Layers, from the floor up</span>
          <ol className="layer-list">
            {layers.map((layer, i) => (
              <li key={i} className="layer-row">
                <input
                  aria-label={`Layer ${i + 1} name`}
                  value={layer}
                  onChange={(e) => setLayers(layers.map((l, j) => (j === i ? e.target.value : l)))}
                />
                {i === layers.length - 1 && layers.length > 1 && (
                  <button type="button" className="icon-btn ghost" aria-label={`Remove the ${layer || 'top'} layer`} onClick={() => setLayers(layers.slice(0, -1))}>
                    <CloseIcon size={20} />
                  </button>
                )}
              </li>
            ))}
          </ol>
          {layers.length < MAX_LAYERS && (
            <button type="button" className="ghost add-layer" onClick={() => setLayers([...layers, `Layer ${layers.length + 1}`])}>
              + Add a layer on top
            </button>
          )}
          <span className="hint">Renaming a layer keeps its storage. Only empty cells and layers can be removed.</span>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary">
          {room ? 'Save room' : 'Add room'}
        </button>
        {room && roomCount > 1 && (
          <button type="button" className="danger" onClick={() => void remove()}>
            Delete room
          </button>
        )}
      </form>
    </Sheet>
  );
}
