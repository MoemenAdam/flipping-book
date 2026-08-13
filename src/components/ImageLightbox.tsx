import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent,
} from 'react';
import { createPortal } from 'react-dom';

export type LightboxOrigin = {
  top: number;
  left: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

type ImageLightboxProps = {
  src: string;
  alt?: string;
  origin: LightboxOrigin;
  onClose: () => void;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Offset = { x: number; y: number };

const DRAG_THRESHOLD = 6;

function getTargetRect(origin: LightboxOrigin): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = vw * 0.9;
  const maxH = vh * 0.82;
  const nw = origin.naturalWidth || origin.width;
  const nh = origin.naturalHeight || origin.height;
  const ratio = nw / (nh || 1);

  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }

  const minTop = 72;
  let top = (vh - height) / 2;
  if (top < minTop) top = minTop;

  return {
    width,
    height,
    left: (vw - width) / 2,
    top,
  };
}

function getZoomScale(origin: LightboxOrigin, target: Rect): number {
  const naturalW = origin.naturalWidth || origin.width;
  const native = naturalW / (target.width || 1);
  if (native > 1.2) return Math.min(Math.max(native, 2), 3);
  return 2.4;
}

function clampOffset(
  x: number,
  y: number,
  scale: number,
  width: number,
  height: number
): Offset {
  const maxX = ((scale - 1) * width) / 2;
  const maxY = ((scale - 1) * height) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

const ImageLightbox = ({ src, alt, origin, onClose }: ImageLightboxProps) => {
  const [phase, setPhase] = useState<'enter' | 'open' | 'leave'>('enter');
  const [target, setTarget] = useState<Rect>(() => getTargetRect(origin));
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const closedRef = useRef(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef<Offset>({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const zoomed = scale > 1.01;

  const originRect = useMemo<Rect>(
    () => ({
      top: origin.top,
      left: origin.left,
      width: origin.width,
      height: origin.height,
    }),
    [origin.top, origin.left, origin.width, origin.height]
  );

  const setZoom = useCallback((nextScale: number, nextOffset: Offset) => {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1, { x: 0, y: 0 });
  }, [setZoom]);

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    resetZoom();
    setPhase((current) => (current === 'leave' ? current : 'leave'));
  }, [resetZoom]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (scaleRef.current > 1.01) {
        resetZoom();
        return;
      }
      close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, resetZoom]);

  useEffect(() => {
    const onResize = () => {
      setTarget(getTargetRect(origin));
      if (scaleRef.current > 1.01) resetZoom();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [origin, resetZoom]);

  useEffect(() => {
    if (phase !== 'leave') return;
    const timeout = window.setTimeout(finishClose, 500);
    return () => window.clearTimeout(timeout);
  }, [phase, finishClose]);

  const toggleZoomAt = useCallback(
    (clientX: number, clientY: number) => {
      if (phase !== 'open') return;
      const frame = frameRef.current;
      if (!frame) return;

      if (scaleRef.current > 1.01) {
        resetZoom();
        return;
      }

      const bounds = frame.getBoundingClientRect();
      const zoomScale = getZoomScale(origin, target);
      const dx = clientX - (bounds.left + bounds.width / 2);
      const dy = clientY - (bounds.top + bounds.height / 2);
      setZoom(
        zoomScale,
        clampOffset(
          dx * (1 - zoomScale),
          dy * (1 - zoomScale),
          zoomScale,
          target.width,
          target.height
        )
      );
    },
    [origin, phase, resetZoom, setZoom, target]
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'open' || event.button !== 0) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    drag.moved = true;
    if (scaleRef.current <= 1.01) return;

    setPanning(true);
    setZoom(
      scaleRef.current,
      clampOffset(
        drag.originX + dx,
        drag.originY + dy,
        scaleRef.current,
        target.width,
        target.height
      )
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setPanning(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!drag.moved) toggleZoomAt(event.clientX, event.clientY);
  };

  const rect = phase === 'open' ? target : originRect;

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'width' && event.propertyName !== 'left') return;
    if (phase === 'leave') finishClose();
  };

  return createPortal(
    <div
      className={`image-lightbox ${phase}${zoomed ? ' zoomed' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'صورة'}
      onClick={close}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        className="image-lightbox-stage"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        onClick={(event) => event.stopPropagation()}
        onTransitionEnd={handleTransitionEnd}
      >
        <button
          type="button"
          className="image-lightbox-close"
          onClick={close}
          aria-label="إغلاق"
        >
          <X size={22} />
        </button>
        <div
          ref={frameRef}
          className={`image-lightbox-frame${zoomed ? ' zoomed' : ''}${
            panning ? ' panning' : ''
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={src}
            alt={alt || ''}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageLightbox;
