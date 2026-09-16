import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { DiscoverySearchPage } from './DiscoverySearchPage';

interface DiscoverySearchSheetProps {
  open: boolean;
  onClose: () => void;
}

const TRANSITION_MS = 220;
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.7;

const reducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function DiscoverySearchSheet({ open, onClose }: DiscoverySearchSheetProps) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef({ y: 0, time: 0 });
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const requestClose = useCallback(() => {
    clearCloseTimer();
    setVisible(false);
    closeTimerRef.current = window.setTimeout(onClose, reducedMotion() ? 0 : TRANSITION_MS);
  }, [clearCloseTimer, onClose]);

  useEffect(() => {
    if (open) {
      clearCloseTimer();
      setRendered(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setRendered(false), reducedMotion() ? 0 : TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [clearCloseTimer, open]);

  useEffect(() => {
    if (!rendered || !open) return;
    closeButtonRef.current?.focus();
    const appFrame = dialogRef.current?.closest<HTMLElement>('.app-frame');
    if (!appFrame) return;
    const previousOverflow = appFrame.style.overflow;
    appFrame.style.overflow = 'hidden';
    return () => {
      appFrame.style.overflow = previousOverflow;
    };
  }, [open, rendered]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]';
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = { y: event.clientY, time: performance.now() };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragging) setDragOffset(Math.max(0, event.clientY - dragStartRef.current.y));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const distance = Math.max(0, event.clientY - dragStartRef.current.y);
    const elapsed = Math.max(1, performance.now() - dragStartRef.current.time);
    setDragging(false);
    if (distance >= CLOSE_DISTANCE || (distance >= 64 && distance / elapsed >= CLOSE_VELOCITY)) requestClose();
    else setDragOffset(0);
  };

  if (!rendered) return null;

  return (
    <div className={`discovery-search-overlay${visible ? ' discovery-search-overlay--visible' : ''}`}>
      <div className='discovery-search-backdrop' data-testid='discovery-search-backdrop' aria-hidden='true' onClick={requestClose} />
      <div
        ref={dialogRef}
        className={`discovery-search-sheet${dragging ? ' discovery-search-sheet--dragging' : ''}`}
        style={{ '--sheet-drag-offset': `${dragOffset}px` } as CSSProperties}
        role='dialog'
        aria-modal='true'
        aria-label='장소 검색'
        onKeyDown={handleKeyDown}
      >
        <button
          type='button'
          className='discovery-search-sheet__handle'
          aria-label='검색창 닫기'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={() => { setDragging(false); setDragOffset(0); }}
        >
          <span aria-hidden='true' />
        </button>
        <div className='discovery-search-sheet__content'>
          <DiscoverySearchPage onClose={requestClose} closeButtonRef={closeButtonRef} />
        </div>
      </div>
    </div>
  );
}
