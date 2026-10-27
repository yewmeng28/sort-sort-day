import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { labelColours } from '../../domain/colour';
import { cellKey, cellsInRect, largestRect, outlineEdges, spaceAtCell } from '../../domain/grid';
import { layoutLabel } from '../../domain/label';
import { fullness, type EditSelection } from '../../domain/spaces';
import type { Cell, Item, Room, Space } from '../../domain/types';

/** Cells never shrink below a comfortable tap size; bigger rooms scroll sideways instead. */
const MIN_CELL = 44;
const MAX_CELL = 96;
/** Height the rest of the screen needs (top bar, layer tabs, legend, tab bar), so tall rooms fit without scrolling. */
const RESERVED_HEIGHT = 340;
/** A press that moves less than this (px) is a tap. */
const TAP_SLOP = 8;
const BADGE_R = 9;
const HATCH_ID = 'map-hatch';

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function useViewportHeight() {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
}

interface Props {
  room: Room;
  spaces: Space[];
  items: Item[];
  layer: number;
  editing: boolean;
  selection: EditSelection;
  highlightSpaceId: string | null;
  /** A tap (no drag) on a cell. */
  onTap: (cell: Cell) => void;
  /** Edit mode: a drag from one cell to another. */
  onDragSelect: (from: Cell, to: Cell) => void;
}

interface Gesture {
  start: Cell;
  startX: number;
  startY: number;
  moved: boolean;
  /** Set once a second finger lands in edit mode: the gesture scrolls instead of selecting. */
  pan?: { midX: number; midY: number; left: number; top: number };
}

/**
 * The room grid, drawn at real pixel size so labels and badges stay readable. Outside edit mode the map scrolls
 * natively and a tap opens a space; in edit mode one finger selects and two fingers scroll.
 */
export function MapGrid({ room, spaces, items, layer, editing, selection, highlightSpaceId, onTap, onDragSelect }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const [drag, setDrag] = useState<{ a: Cell; b: Cell } | null>(null);

  // 4px for the frame's border.
  const width = Math.max(0, (useWidth(areaRef) || 324) - 4);
  const maxHeight = Math.max(240, useViewportHeight() - RESERVED_HEIGHT);
  const cell = Math.round(Math.min(MAX_CELL, Math.max(MIN_CELL, Math.min(width / room.cols, maxHeight / room.rows))));
  const w = room.cols * cell;
  const h = room.rows * cell;

  // Bring a highlighted space (from Search) into view on wide maps.
  useEffect(() => {
    const target = spaces.find((s) => s.id === highlightSpaceId);
    const rect = target && largestRect(target.cells, layer);
    const scroller = scrollRef.current;
    if (!rect || !scroller) return;
    scroller.scrollTo({ left: Math.max(0, (rect.x + rect.w / 2) * cell - scroller.clientWidth / 2), behavior: 'smooth' });
  }, [highlightSpaceId, spaces, layer, cell]);

  const cellAt = (clientX: number, clientY: number): Cell => {
    const r = svgRef.current!.getBoundingClientRect();
    const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max - 1);
    return { x: clamp(Math.floor((clientX - r.left) / cell), room.cols), y: clamp(Math.floor((clientY - r.top) / cell), room.rows), layer };
  };

  const midpoint = () => {
    const [p, q] = [...pointers.current.values()];
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const start = cellAt(e.clientX, e.clientY);
      gesture.current = { start, startX: e.clientX, startY: e.clientY, moved: false };
      if (editing) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ a: start, b: start });
      }
    } else if (editing && pointers.current.size === 2 && gesture.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const mid = midpoint();
      gesture.current = { ...gesture.current, moved: true, pan: { midX: mid.x, midY: mid.y, left: scrollRef.current?.scrollLeft ?? 0, top: window.scrollY } };
      setDrag(null);
    }
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pan) {
      if (pointers.current.size < 2) return;
      const mid = midpoint();
      if (scrollRef.current) scrollRef.current.scrollLeft = g.pan.left - (mid.x - g.pan.midX);
      window.scrollTo({ top: g.pan.top - (mid.y - g.pan.midY) });
      return;
    }
    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > TAP_SLOP) g.moved = true;
    if (editing && drag) setDrag({ a: drag.a, b: cellAt(e.clientX, e.clientY) });
  };

  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    // Wait until every finger has lifted.
    if (!g || pointers.current.size > 0) return;
    gesture.current = null;
    const d = drag;
    setDrag(null);
    if (g.pan) return;
    if (editing) {
      // Wobbling inside one cell still counts as a tap.
      if (d && (d.a.x !== d.b.x || d.a.y !== d.b.y)) onDragSelect(d.a, d.b);
      else onTap(g.start);
      return;
    }
    if (!g.moved) onTap(g.start);
  };

  const onCancel = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDrag(null);
    }
  };

  const otherLayers = new Set(spaces.flatMap((s) => s.cells.filter((c) => c.layer !== layer).map((c) => `${c.x},${c.y}`)));
  const selectedSpace = spaces.find((s) => s.id === selection.spaceId);
  const preview = drag ? cellsInRect(drag.a.x, drag.a.y, drag.b.x, drag.b.y, layer) : [];
  let hasHatch = false;

  const cells = [];
  for (let y = 0; y < room.rows; y++) {
    for (let x = 0; x < room.cols; x++) {
      const owner = spaceAtCell(spaces, { x, y, layer });
      const hatched = !owner && otherLayers.has(`${x},${y}`);
      hasHatch ||= hatched;
      cells.push(
        <rect
          key={`${x},${y}`}
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          fill={owner?.color ?? (hatched ? `url(#${HATCH_ID})` : 'transparent')}
          shapeRendering={owner ? 'crispEdges' : undefined}
          className={['cell', owner ? 'owned' : '', owner && owner.id === highlightSpaceId ? 'highlight' : ''].join(' ')}
        />,
      );
    }
  }

  return (
    <div className="grid-area" ref={areaRef}>
      <div className="grid-scroll" ref={scrollRef}>
        <svg
          ref={svgRef}
          className="grid"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ touchAction: editing ? 'none' : 'pan-x pan-y' }}
          role="img"
          aria-label={`Map of ${room.name}, ${room.layers[layer]} layer. The spaces are listed below the map.`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <defs>
            <pattern id={HATCH_ID} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" className="hatch-line" />
            </pattern>
          </defs>

          {cells}

          {spaces.map((s) =>
            outlineEdges(s.cells, layer).map(([x1, y1, x2, y2], i) => (
              <line key={`${s.id}-edge-${i}`} x1={x1 * cell} y1={y1 * cell} x2={x2 * cell} y2={y2 * cell} className="outline" />
            )),
          )}

          {selectedSpace && (
            <>
              {selectedSpace.cells
                .filter((c) => c.layer === layer)
                .map((c) => (
                  <rect key={`sel-${cellKey(c)}`} x={c.x * cell} y={c.y * cell} width={cell} height={cell} className="selected-fill" />
                ))}
              {outlineEdges(selectedSpace.cells, layer).map(([x1, y1, x2, y2], i) => (
                <line key={`sel-edge-${i}`} x1={x1 * cell} y1={y1 * cell} x2={x2 * cell} y2={y2 * cell} className="selected-outline" />
              ))}
            </>
          )}

          {spaces.map((s) => {
            const rect = largestRect(s.cells, layer);
            if (!rect) return null;
            const { count, overfull } = fullness(s, items);
            const label = layoutLabel(rect, s.name, cell, count > 0 ? BADGE_R * 2 + 2 : 0);
            const colours = labelColours(s.color);
            const firstLineY = label.cy - ((label.lines.length - 1) * label.lineHeight) / 2;
            const bx = (rect.x + rect.w) * cell - BADGE_R - 3;
            const by = rect.y * cell + BADGE_R + 3;
            return (
              <g key={s.id}>
                <text
                  x={label.cx}
                  y={firstLineY}
                  fontSize={label.fontSize}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={label.rotate ? `rotate(-90 ${label.cx} ${label.cy})` : undefined}
                  className="label"
                  style={{ fill: colours.text, stroke: colours.halo }}
                >
                  {label.lines.map((line, i) => (
                    <tspan key={i} x={label.cx} dy={i === 0 ? 0 : label.lineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {count > 0 && (
                  <g className={`count-badge${overfull ? ' overfull' : ''}`}>
                    <circle cx={bx} cy={by} r={BADGE_R} />
                    <text x={bx} y={by} textAnchor="middle" dominantBaseline="central">
                      {count > 99 ? '99+' : count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {selection.cells
            .filter((c) => c.layer === layer)
            .map((c) => (
              <rect key={`cell-${cellKey(c)}`} x={c.x * cell} y={c.y * cell} width={cell} height={cell} className="selected" />
            ))}
          {preview.map((c) => (
            <rect key={`pre-${cellKey(c)}`} x={c.x * cell} y={c.y * cell} width={cell} height={cell} className="preview" />
          ))}
        </svg>
      </div>
      {hasHatch && (
        <p className="legend">
          <svg width="16" height="16" aria-hidden="true">
            <rect width="16" height="16" rx="3" fill={`url(#${HATCH_ID})`} className="legend-swatch" />
          </svg>
          Storage on another layer
        </p>
      )}
    </div>
  );
}
