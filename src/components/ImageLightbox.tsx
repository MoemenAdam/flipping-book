import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

function getTargetRect(origin: LightboxOrigin): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = vw * 0.88;
  const maxH = vh * 0.78;
  const nw = origin.naturalWidth || origin.width;
  const nh = origin.naturalHeight || origin.height;
  const ratio = nw / (nh || 1);

  let width = nw;
  let height = nh;

  if (width > maxW) {
    width = maxW;
    height = width / ratio;
  }
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

const ImageLightbox = ({ src, alt, origin, onClose }: ImageLightboxProps) => {
  const [phase, setPhase] = useState<'enter' | 'open' | 'leave'>('enter');
  const [target, setTarget] = useState<Rect>(() => getTargetRect(origin));
  const closedRef = useRef(false);

  const originRect = useMemo<Rect>(
    () => ({
      top: origin.top,
      left: origin.left,
      width: origin.width,
      height: origin.height,
    }),
    [origin.top, origin.left, origin.width, origin.height]
  );

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  const close = useCallback(() => {
    setPhase((current) => (current === 'leave' ? current : 'leave'));
  }, []);

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
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  useEffect(() => {
    const onResize = () => setTarget(getTargetRect(origin));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [origin]);

  useEffect(() => {
    if (phase !== 'leave') return;
    const timeout = window.setTimeout(finishClose, 500);
    return () => window.clearTimeout(timeout);
  }, [phase, finishClose]);

  const rect = phase === 'open' ? target : originRect;

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'width' && event.propertyName !== 'left') return;
    if (phase === 'leave') finishClose();
  };

  return createPortal(
    <div
      className={`image-lightbox ${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'صورة'}
      onClick={close}
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
        <img src={src} alt={alt || ''} draggable={false} />
      </div>
    </div>,
    document.body
  );
};

export default ImageLightbox;
