import { useRef, useState, type PointerEvent } from 'react';
import { useRepos } from '../../data/RepoContext';
import { play } from '../../app/sound';
import {
  cellKey,
  cellsInRect,
  extendThroughLayers,
  isMergedSelection,
  largestRect,
  mergeSelection,
  outlineEdges,
  removeCells,
  spaceAtCell,
  spacesTouching,
  unmergeSelection,
} from '../../domain/grid';
import { layoutLabel } from '../../domain/label';
import { moveSpace } from '../../domain/rooms';
import type { Cell, Item, Room, Space } from '../../domain/types';

const SIZE = 60;
const PALETTE = ['#8a5a2b', '#5b7b4a', '#4a6b8a', '#8a4a4a', '#7a5a8a', '#8a7a2b', '#3f7a73'];

interface Props {
  room: Room;
  spaces: Space[];
  items: Item[];
  highlightSpaceId: string | null;
  onOpenSpace: (spaceId: string) => void;
}

export function MapEditor({ room, spaces, items, highlightSpaceId, onOpenSpace }: Props) {
  const repos = useRepos();
  const svgRef = useRef<SVGSVGElement>(null);
  const [layer, setLayer] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<Cell[]>([]);
  const [drag, setDrag] = useState<{ a: Cell; b: Cell } | null>(null);
  const [notice, setNotice] = useState('');

  /** Shift the selected space (all its cells, on every layer); the selection follows it so you can keep nudging. */
  const nudge = async (dx: number, dy: number) => {
    const result = moveSpace(room, spaces, touching[0].id, dx, dy);
    if (!result.ok) {
      setNotice(result.error);
      play('cancel');
      return;
    }
    await repos.spaces.save(result.value);
    setNotice('');
    setSelection(result.value.cells.filter((c) => c.layer === layer));
    play('tick');
  };

  const selectedKeys = new Set(selection.map(cellKey));
  const touching = spacesTouching(spaces, selection);
  const allMerged = isMergedSelection(spaces, selection);
  const countIn = (spaceId: string) => items.filter((i) => i.spaceId === spaceId && i.status === 'stored').length;

  const cellFromEvent = (e: PointerEvent): Cell => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * room.cols);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * room.rows);
    return { x: Math.min(Math.max(x, 0), room.cols - 1), y: Math.min(Math.max(y, 0), room.rows - 1), layer };
  };

  const onDown = (e: PointerEvent) => {
    const cell = cellFromEvent(e);
    if (!editing) {
      const hit = spaceAtCell(spaces, cell);
      if (hit) {
        play('chest');
        onOpenSpace(hit.id);
      }
      return;
    }
    svgRef.current!.setPointerCapture(e.pointerId);
    setDrag({ a: cell, b: cell });
  };

  const onMove = (e: PointerEvent) => {
    if (drag) setDrag({ a: drag.a, b: cellFromEvent(e) });
  };

  const onUp = () => {
    if (!drag) return;
    const rect = cellsInRect(drag.a.x, drag.a.y, drag.b.x, drag.b.y, layer);
    const single = rect.length === 1;
    play('tick');
    setNotice('');
    setSelection((prev) => {
      if (single && selectedKeys.has(cellKey(rect[0]))) return prev.filter((c) => cellKey(c) !== cellKey(rect[0]));
      return [...prev, ...rect.filter((c) => !selectedKeys.has(cellKey(c)))];
    });
    setDrag(null);
  };

  const changeLayer = (next: number) => {
    setLayer(next);
    setSelection([]);
  };

  const unmerge = async () => {
    await repos.spaces.apply({ save: unmergeSelection(spaces, selection, () => crypto.randomUUID()) });
    play('cancel');
    setSelection([]);
  };

  const mergeOrCreate = async () => {
    if (!selection.length) return;
    const { merged, absorbedIds } = mergeSelection(spaces, selection, () => ({
      id: crypto.randomUUID(),
      roomId: room.id,
      name: window.prompt('Name this space', 'Cupboard')?.trim() || 'Space',
      color: PALETTE[spaces.length % PALETTE.length],
    }));
    await repos.spaces.apply({ save: [merged], remove: absorbedIds });
    // Items from absorbed spaces follow the merged space.
    await Promise.all(
      items.filter((i) => i.spaceId && absorbedIds.includes(i.spaceId)).map((i) => repos.items.save({ ...i, spaceId: merged.id })),
    );
    play('confirm');
    setSelection([]);
  };

  const rename = async () => {
    const target = touching[0];
    const name = target && window.prompt('Rename space', target.name)?.trim();
    if (!target || !name) return;
    await repos.spaces.save({ ...target, name });
    play('confirm');
  };

  const spanLayers = async () => {
    if (touching.length !== 1) return;
    await repos.spaces.save(extendThroughLayers(touching[0], room.layers.length));
    play('confirm');
  };

  const clearCells = async () => {
    const { updated, emptiedIds } = removeCells(spaces, selection);
    await repos.spaces.apply({ save: updated, remove: emptiedIds });
    await Promise.all(
      items.filter((i) => i.spaceId && emptiedIds.includes(i.spaceId)).map((i) => repos.items.save({ ...i, spaceId: null })),
    );
    play('cancel');
    setSelection([]);
  };

  const preview = drag ? new Set(cellsInRect(drag.a.x, drag.a.y, drag.b.x, drag.b.y, layer).map(cellKey)) : null;
  const ghostKeys = new Set(
    spaces.flatMap((s) => s.cells.filter((c) => c.layer !== layer).map((c) => `${c.x},${c.y}`)),
  );

  return (
    <section className="panel">
      <div className="row">
        <div className="tabs" role="tablist" aria-label="Room layers">
          {room.layers.map((name, i) => (
            <button key={name} role="tab" aria-selected={i === layer} className={i === layer ? 'active' : ''} onClick={() => changeLayer(i)}>
              {name}
            </button>
          ))}
        </div>
        <button className={editing ? 'active' : ''} onClick={() => { setEditing(!editing); setSelection([]); play('tick'); }}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <svg
        ref={svgRef}
        className="grid"
        viewBox={`0 0 ${room.cols * SIZE} ${room.rows * SIZE}`}
        style={{ aspectRatio: `${room.cols} / ${room.rows}` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setDrag(null)}
      >
        {Array.from({ length: room.rows }, (_, y) =>
          Array.from({ length: room.cols }, (_, x) => {
            const cell = { x, y, layer };
            const owner = spaceAtCell(spaces, cell);
            const key = cellKey(cell);
            return (
              <rect
                key={key}
                x={x * SIZE}
                y={y * SIZE}
                width={SIZE}
                height={SIZE}
                fill={owner?.color ?? 'transparent'}
                shapeRendering={owner ? 'crispEdges' : undefined}
                className={['cell', owner ? 'owned' : '', owner?.id === highlightSpaceId ? 'highlight' : ''].join(' ')}
                strokeDasharray={!owner && ghostKeys.has(`${x},${y}`) ? '4 4' : undefined}
                data-ghost={!owner && ghostKeys.has(`${x},${y}`) ? '1' : undefined}
              />
            );
          }),
        )}
        {spaces.map((s) =>
          outlineEdges(s.cells, layer).map(([x1, y1, x2, y2], i) => (
            <line key={`${s.id}-edge-${i}`} x1={x1 * SIZE} y1={y1 * SIZE} x2={x2 * SIZE} y2={y2 * SIZE} className="outline" />
          )),
        )}
        {spaces.map((s) => {
          const rect = largestRect(s.cells, layer);
          if (!rect) return null;
          const { text, cx, cy, rotate, fontSize } = layoutLabel(rect, `${s.name} (${countIn(s.id)})`, SIZE);
          return (
            <text
              key={s.id}
              x={cx}
              y={cy}
              fontSize={fontSize}
              textAnchor="middle"
              dominantBaseline="central"
              transform={rotate ? `rotate(-90 ${cx} ${cy})` : undefined}
              className="label"
            >
              {text}
            </text>
          );
        })}
        {[...selectedKeys].map((key) => {
          const [x, y] = key.split(',').map(Number);
          return <rect key={`sel-${key}`} x={x * SIZE} y={y * SIZE} width={SIZE} height={SIZE} className="selected" />;
        })}
        {preview &&
          [...preview].map((key) => {
            const [x, y] = key.split(',').map(Number);
            return <rect key={`pre-${key}`} x={x * SIZE} y={y * SIZE} width={SIZE} height={SIZE} className="preview" />;
          })}
      </svg>

      {editing ? (
        <div className="row wrap">
          <span className="hint">Drag to select cells, tap a cell to toggle.</span>
          <button disabled={!selection.length} onClick={allMerged ? unmerge : mergeOrCreate}>
            {allMerged ? 'Unmerge' : touching.length ? 'Merge' : 'Create space'}
          </button>
          <button disabled={touching.length !== 1} onClick={rename}>Rename</button>
          <label className="colour">
            Colour
            <input
              type="color"
              aria-label="Space colour"
              disabled={touching.length !== 1}
              value={touching.length === 1 ? touching[0].color : '#8a5a2b'}
              onChange={(e) => void repos.spaces.save({ ...touching[0], color: e.target.value })}
            />
          </label>
          <button disabled={touching.length !== 1} onClick={spanLayers}>Span layers</button>
          <button disabled={!selection.length} onClick={clearCells}>Clear</button>
          {touching.length === 1 && (
            <div className="row wrap move" role="group" aria-label={`Move ${touching[0].name}`}>
              <span className="hint">Move {touching[0].name}:</span>
              <button aria-label="Move left" onClick={() => void nudge(-1, 0)}>◀</button>
              <button aria-label="Move up" onClick={() => void nudge(0, -1)}>▲</button>
              <button aria-label="Move down" onClick={() => void nudge(0, 1)}>▼</button>
              <button aria-label="Move right" onClick={() => void nudge(1, 0)}>▶</button>
            </div>
          )}
          {notice && <p className="error" role="status">{notice}</p>}
        </div>
      ) : (
        <p className="hint">Tap a chest to open it. Dashed cells have storage on another layer.</p>
      )}
    </section>
  );
}
