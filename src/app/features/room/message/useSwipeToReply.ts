import { useEffect, useRef, useState } from 'react';
import type { RefObject, TouchEvent } from 'react';

const ACTIVATION_DX = 12;
const TRIGGER_DX = 56;
const MAX_DX = 84;
const VERTICAL_RATIO = 1.6;

type SwipeHandlers = {
  onTouchStart: (evt: TouchEvent) => void;
  onTouchMove: (evt: TouchEvent) => void;
  onTouchEnd: (evt: TouchEvent) => void;
  onTouchCancel: () => void;
};

type Gesture = {
  id: number;
  startX: number;
  startY: number;
  swiping: boolean;
  triggered: boolean;
};

/**
 * Swipe-right-to-reply for touch screens. Slides the message aside with a
 * reply hint and fires `onSwipe` past the threshold. Never calls
 * `preventDefault`, so vertical scrolling keeps working untouched.
 */
export function useSwipeToReply(
  trackRef: RefObject<HTMLElement | null>,
  hintRef: RefObject<HTMLElement | null>,
  onSwipe?: () => void,
): SwipeHandlers {
  const [coarsePointer] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
  );
  const gesture = useRef<Gesture | null>(null);
  const handlerRef = useRef(onSwipe);
  handlerRef.current = onSwipe;
  const snapBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (snapBackTimer.current) clearTimeout(snapBackTimer.current);
    },
    [],
  );

  const setOffset = (dx: number) => {
    const track = trackRef.current;
    if (track) track.style.transform = dx > 0 ? `translateX(${Math.round(dx)}px)` : '';
    const hint = hintRef.current;
    if (hint) {
      // The hint stays pinned to the left gutter while the content slides
      // right, so it is gradually uncovered to the left of the avatar.
      const progress = dx > 0 ? Math.min(1, dx / TRIGGER_DX) : 0;
      hint.style.opacity = progress > 0 ? String(progress) : '0';
      hint.style.transform =
        progress > 0
          ? `translateX(${(progress * 6).toFixed(1)}px) scale(${(0.7 + progress * 0.3).toFixed(2)})`
          : '';
    }
  };

  const snapBack = () => {
    const track = trackRef.current;
    if (track) {
      track.style.transition = 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)';
      track.style.transform = '';
      if (snapBackTimer.current) clearTimeout(snapBackTimer.current);
      snapBackTimer.current = setTimeout(() => {
        track.style.transition = '';
      }, 200);
    }
    const hint = hintRef.current;
    if (hint) {
      hint.style.transition = 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)';
      hint.style.opacity = '0';
      setTimeout(() => {
        hint.style.transition = '';
      }, 200);
    }
  };

  const cancel = () => {
    gesture.current = null;
    snapBack();
  };

  return {
    onTouchStart: (evt) => {
      if (!coarsePointer || !handlerRef.current || evt.touches.length !== 1) {
        gesture.current = null;
        return;
      }
      // Don't hijack an in-progress text selection adjustment.
      if (!window.getSelection()?.isCollapsed) {
        gesture.current = null;
        return;
      }
      if (snapBackTimer.current) clearTimeout(snapBackTimer.current);
      const track = trackRef.current;
      if (track) track.style.transition = '';
      const touch = evt.touches[0];
      gesture.current = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        swiping: false,
        triggered: false,
      };
    },
    onTouchMove: (evt) => {
      const g = gesture.current;
      if (!g || !handlerRef.current) return;
      const touch = Array.from(evt.touches).find((t) => t.identifier === g.id);
      if (!touch) return;
      const dx = touch.clientX - g.startX;
      const dy = Math.abs(touch.clientY - g.startY);
      if (!g.swiping) {
        if (dx < ACTIVATION_DX || dx < dy * VERTICAL_RATIO) return;
        g.swiping = true;
      }
      if (dx <= 0) {
        g.triggered = false;
        setOffset(0);
        return;
      }
      setOffset(Math.min(dx, MAX_DX));
      if (dx >= TRIGGER_DX && !g.triggered) {
        g.triggered = true;
        try {
          navigator.vibrate?.(8);
        } catch {
          // haptics unavailable; ignore
        }
      } else if (dx < TRIGGER_DX) {
        g.triggered = false;
      }
    },
    onTouchEnd: () => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || !g.swiping) return;
      if (g.triggered) handlerRef.current?.();
      snapBack();
    },
    onTouchCancel: cancel,
  };
}
