import { useState } from 'react';
import { useRepos } from '../../data/RepoContext';
import { Mascot } from '../../app/Mascot';
import { play } from '../../app/sound';
import { SPACE_COLOURS } from '../../domain/colour';
import {
  isMergedSelection,
  mergeSelection,
  removeCells,
  spaceAtCell,
  spaceLayers,
  spacesTouching,
  unmergeSelection,
} from '../../domain/grid';
import { moveSpace, spanAllLayers } from '../../domain/rooms';
import { deleteSpaceChanges, dragCells, fullness, NO_SELECTION, tapCell, type EditSelection } from '../../domain/spaces';
import { plural } from '../../domain/text';
import type { Cell, Item, Room, Space } from '../../domain/types';
import { Swatches } from '../../ui/Swatches';
import { useToast } from '../../ui/Toast';
import { MapGrid } from './MapGrid';
import { SpaceList } from './SpaceList';

interface Props {
  room: Room;
  spaces: Space[];
  items: Item[];
  highlightSpaceId: string | null;
  /** No spaces or items anywhere yet: greet with the app's name. */
  firstRun: boolean;
  onOpenSpace: (spaceId: string) => void;
}

/** What an edit changed, so Undo can put it back: original spaces and items, plus spaces the edit created. */
interface Snapshot {
  spaces: Space[];
  removeSpaceIds: string[];
  items: Item[];
}

export function MapEditor({ room, spaces, items, highlightSpaceId, firstRun, onOpenSpace }: Props) {
  const repos = useRepos();
  const toast = useToast();
  // Open on the layer of a space highlighted from Search.
  const [layer, setLayer] = useState(() => {
    const target = spaces.find((s) => s.id === highlightSpaceId);
    return target ? Math.min(...spaceLayers(target)) : 0;
  });
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<EditSelection>(NO_SELECTION);
  const [notice, setNotice] = useState('');

  const selectedSpace = spaces.find((s) => s.id === selection.spaceId);
  const cells = selection.cells;
  const touching = spacesTouching(spaces, cells);
  const ownedCount = cells.filter((c) => spaceAtCell(spaces, c)).length;
  const hasEmpty = ownedCount < cells.length;

  const select = (next: EditSelection) => {
    setSelection(next);
    setNotice('');
  };

  const restore = async (snapshot: Snapshot) => {
    await repos.spaces.apply({ save: snapshot.spaces, remove: snapshot.removeSpaceIds });
    await Promise.all(snapshot.items.map((i) => repos.items.save(i)));
    play('tick');
  };
  const offerUndo = (message: string, snapshot: Snapshot) =>
    toast({ message, action: { label: 'Undo', run: () => void restore(snapshot) } });

  // ---------- cell selection actions ----------

  const createOrMerge = async () => {
    const isNew = touching.length === 0;
    const name = isNew ? window.prompt('Name this space', 'Cupboard')?.trim() : undefined;
    if (isNew && name === undefined) return;
    const { merged, absorbedIds } = mergeSelection(spaces, cells, () => ({
      id: crypto.randomUUID(),
      roomId: room.id,
      name: name || 'Space',
      color: SPACE_COLOURS[spaces.length % SPACE_COLOURS.length].hex,
    }));
    const moved = items.filter((i) => i.spaceId && absorbedIds.includes(i.spaceId));
    await repos.spaces.apply({ save: [merged], remove: absorbedIds });
    await Promise.all(moved.map((i) => repos.items.save({ ...i, spaceId: merged.id, updatedAt: Date.now() })));
    play('confirm');
    // Select the result so it can be named, coloured or moved straight away.
    select({ spaceId: merged.id, cells: [] });
    if (!isNew) offerUndo(`Merged into ${merged.name}`, { spaces: touching, removeSpaceIds: [], items: moved });
  };

  const unmergeCells = async () => {
    const result = unmergeSelection(spaces, cells, () => crypto.randomUUID());
    const created = result.filter((s) => !touching.some((t) => t.id === s.id)).map((s) => s.id);
    await repos.spaces.apply({ save: result });
    play('cancel');
    select(NO_SELECTION);
    offerUndo('Unmerged', { spaces: touching, removeSpaceIds: created, items: [] });
  };

  const removeSelectedCells = async () => {
    const { updated, emptiedIds } = removeCells(spaces, cells);
    const homeless = items.filter((i) => i.spaceId && emptiedIds.includes(i.spaceId));
    await repos.spaces.apply({ save: updated, remove: emptiedIds });
    await Promise.all(homeless.map((i) => repos.items.save({ ...i, spaceId: null, updatedAt: Date.now() })));
    play('cancel');
    select(NO_SELECTION);
    offerUndo(`Removed ${plural(ownedCount, 'cell')}`, { spaces: touching, removeSpaceIds: [], items: homeless });
  };

  // ---------- selected space actions ----------

  const rename = async (space: Space) => {
    const name = window.prompt('Rename space', space.name)?.trim();
    if (!name || name === space.name) return;
    await repos.spaces.save({ ...space, name });
    play('confirm');
  };

  const recolour = (space: Space, color: string) => void repos.spaces.save({ ...space, color });

  const spanLayers = async (space: Space) => {
    const result = spanAllLayers(room, spaces, space.id);
    if (!result.ok) {
      setNotice(result.error);
      play('cancel');
      return;
    }
    await repos.spaces.save(result.value);
    setNotice('');
    play('confirm');
  };

  const nudge = async (space: Space, dx: number, dy: number) => {
    const result = moveSpace(room, spaces, space.id, dx, dy);
    if (!result.ok) {
      setNotice(result.error);
      play('cancel');
      return;
    }
    await repos.spaces.save(result.value);
    setNotice('');
    play('tick');
  };

  const deleteSpace = async (space: Space) => {
    const change = deleteSpaceChanges(space, items, Date.now());
    const originals = items.filter((i) => i.spaceId === space.id);
    await repos.spaces.apply({ remove: change.removeSpaceIds });
    await Promise.all(change.items.map((i) => repos.items.save(i)));
    play('cancel');
    select(NO_SELECTION);
    offerUndo(`Deleted ${space.name}`, { spaces: [space], removeSpaceIds: [], items: originals });
  };

  // ---------- map gestures ----------

  const onTap = (cell: Cell) => {
    if (editing) {
      play('tick');
      select(tapCell(selection, spaces, cell));
      return;
    }
    const hit = spaceAtCell(spaces, cell);
    if (hit) {
      play('chest');
      onOpenSpace(hit.id);
    }
  };

  const onDragSelect = (from: Cell, to: Cell) => {
    play('tick');
    select(dragCells(selection, from, to));
  };

  const changeLayer = (next: number) => {
    setLayer(next);
    // A selected space stays selected if it reaches the new layer; loose cells belong to the old one.
    if (selectedSpace && selectedSpace.cells.some((c) => c.layer === next)) setNotice('');
    else select(NO_SELECTION);
  };

  const toggleEditing = () => {
    setEditing(!editing);
    select(NO_SELECTION);
    play('tick');
  };

  const empty = spaces.length === 0;

  return (
    <section className="panel map-panel">
      <div className="row">
        <div className="tabs" role="tablist" aria-label="Room layers">
          {room.layers.map((name, i) => (
            <button key={name} role="tab" aria-selected={i === layer} className={i === layer ? 'active' : ''} onClick={() => changeLayer(i)}>
              {name}
            </button>
          ))}
        </div>
        <button className={editing ? 'primary' : ''} onClick={toggleEditing}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <MapGrid
        room={room}
        spaces={spaces}
        items={items}
        layer={layer}
        editing={editing}
        selection={selection}
        highlightSpaceId={highlightSpaceId}
        onTap={onTap}
        onDragSelect={onDragSelect}
      />

      {editing ? (
        <div className="toolbar">
          {selectedSpace ? (
            <>
              <p className="toolbar-title">
                <span className="dot" style={{ background: selectedSpace.color }} aria-hidden="true" />
                <b>{selectedSpace.name}</b>
                <span className="hint">{plural(fullness(selectedSpace, items).count, 'item')}</span>
              </p>
              <div className="toolbar-row">
                <button onClick={() => void rename(selectedSpace)}>Rename</button>
                {spaceLayers(selectedSpace).length < room.layers.length && (
                  <button onClick={() => void spanLayers(selectedSpace)}>Span all layers</button>
                )}
                <button className="danger" onClick={() => void deleteSpace(selectedSpace)}>
                  Delete space
                </button>
              </div>
              <Swatches value={selectedSpace.color} onChange={(c) => recolour(selectedSpace, c)} label={`${selectedSpace.name} colour`} />
              <div className="toolbar-row move" role="group" aria-label={`Move ${selectedSpace.name}`}>
                <span className="hint">Move</span>
                <button aria-label="Move left" onClick={() => void nudge(selectedSpace, -1, 0)}>◀</button>
                <button aria-label="Move up" onClick={() => void nudge(selectedSpace, 0, -1)}>▲</button>
                <button aria-label="Move down" onClick={() => void nudge(selectedSpace, 0, 1)}>▼</button>
                <button aria-label="Move right" onClick={() => void nudge(selectedSpace, 1, 0)}>▶</button>
              </div>
            </>
          ) : cells.length ? (
            <>
              <p className="toolbar-title">
                <b>{plural(cells.length, 'cell')} selected</b>
              </p>
              <div className="toolbar-row">
                {touching.length === 0 && (
                  <button className="primary" onClick={() => void createOrMerge()}>
                    Create space
                  </button>
                )}
                {touching.length === 1 && hasEmpty && (
                  <button className="primary" onClick={() => void createOrMerge()}>
                    Add to {touching[0].name}
                  </button>
                )}
                {touching.length > 1 && (
                  <button className="primary" onClick={() => void createOrMerge()}>
                    Merge spaces
                  </button>
                )}
                {isMergedSelection(spaces, cells) && <button onClick={() => void unmergeCells()}>Unmerge</button>}
                {ownedCount > 0 && (
                  <button className="danger" onClick={() => void removeSelectedCells()}>
                    Remove {plural(ownedCount, 'cell')}
                  </button>
                )}
                <button className="ghost" onClick={() => select(NO_SELECTION)}>
                  Clear selection
                </button>
              </div>
            </>
          ) : (
            <p className="hint">Tap a space to change it, or drag across empty cells to make a new one.</p>
          )}
          {notice && (
            <p className="error" role="status">
              {notice}
            </p>
          )}
        </div>
      ) : empty ? (
        <div className="empty-state">
          <Mascot size={72} />
          <div className="stack">
            <h3>{firstRun ? 'Welcome to Sort Sort Day' : `${room.name} is empty`}</h3>
            <p className="hint">
              Tap Edit, then drag across the grid to mark your first storage space: a wardrobe, a shelf, a box under the bed.
            </p>
            <button className="primary" onClick={toggleEditing}>
              Start editing
            </button>
          </div>
        </div>
      ) : (
        <SpaceList room={room} spaces={spaces} items={items} layer={layer} onOpen={onOpenSpace} />
      )}
    </section>
  );
}
