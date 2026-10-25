import { useRef, useEffect } from 'react';

/**
 * Custom hook enabling smooth mouse click-and-drag horizontal scrolling
 * for desktop mouse pointers, while preserving 100% native touch and gesture
 * scrolling on mobile devices without blocking vertical page scroll.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;

    // Prevent click on child buttons/links only if the user performed an intentional drag
    const onClickCapture = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      // Only handle mouse pointer drags. Touch devices must use native browser momentum scroll.
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      
      // Do not initiate drag if directly clicking interactive inputs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      isDown = true;
      hasDragged = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const onPointerLeaveOrUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !isDown) return;
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };

    const onPointerMove = (e: PointerEvent) => {
      // Only process mouse pointer moves. Do not interfere with touch events.
      if (e.pointerType !== 'mouse' || !isDown) return;
      
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.2; // drag multiplier
      
      // Threshold (6px) to distinguish intentional drag from tap/click
      if (Math.abs(walk) > 6) {
        if (!hasDragged) {
          hasDragged = true;
          el.classList.add('cursor-grabbing');
        }
        el.scrollLeft = scrollLeft - walk;
      }
    };

    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerleave', onPointerLeaveOrUp);
    el.addEventListener('pointerup', onPointerLeaveOrUp);
    el.addEventListener('pointermove', onPointerMove);

    return () => {
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerleave', onPointerLeaveOrUp);
      el.removeEventListener('pointerup', onPointerLeaveOrUp);
      el.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return ref;
}

