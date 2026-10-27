import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { CloseIcon } from './icons';

/** How far the sheet must be dragged down (px) before letting go closes it. */
const DISMISS_DISTANCE = 90;

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom sheet. Closes with the ✕ button, Escape, a tap on the dimmed backdrop, or dragging the handle or header down.
 * The header stays put while the body scrolls.
 */
export function Sheet({ title, onClose, children }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const dragStart = useRef<number | null>(null);
  const pressedBackdrop = useRef(false);
  const [dragY, setDragY] = useState(0);

  // Parents pass a new onClose each render; keep the latest without re-running the mount effect below.
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const startDrag = (e: PointerEvent<HTMLElement>) => {
    // Let buttons in the header work normally.
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientY;
  };
  const moveDrag = (e: PointerEvent<HTMLElement>) => {
    if (dragStart.current !== null) setDragY(Math.max(0, e.clientY - dragStart.current));
  };
  const endDrag = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > DISMISS_DISTANCE) closeRef.current();
    else setDragY(0);
  };
  const dragHandlers = { onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag };

  return (
    <div
      className="modal"
      role="presentation"
      // Only a press that starts and ends on the backdrop closes, so dragging out of the sheet doesn't.
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) closeRef.current();
        pressedBackdrop.current = false;
      }}
    >
      <section
        ref={panelRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div className="sheet-grab" {...dragHandlers}>
          <span className="sheet-handle" />
        </div>
        <header className="sheet-header" {...dragHandlers}>
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn ghost" aria-label="Close" onClick={() => closeRef.current()}>
            <CloseIcon />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
