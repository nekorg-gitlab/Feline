import { ReactNode, useEffect } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';
import { EXPLORE_PATH, HOME_PATH, INBOX_PATH, SPACE_PATH } from './paths';

type MobileFriendlyClientNavProps = {
  children: ReactNode;
};
export function MobileFriendlyClientNav({ children }: MobileFriendlyClientNavProps) {
  const screenSize = useScreenSizeContext();
  const homeMatch = useMatch({ path: HOME_PATH, caseSensitive: true, end: true });
  const spaceMatch = useMatch({ path: SPACE_PATH, caseSensitive: true, end: true });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, caseSensitive: true, end: true });
  const inboxMatch = useMatch({ path: INBOX_PATH, caseSensitive: true, end: true });

  if (
    screenSize === ScreenSize.Mobile &&
    !(homeMatch || spaceMatch || exploreMatch || inboxMatch)
  ) {
    return null;
  }

  return children;
}

type MobileFriendlyPageNavProps = {
  path: string;
  children: ReactNode;
};
export function MobileFriendlyPageNav({ path, children }: MobileFriendlyPageNavProps) {
  const screenSize = useScreenSizeContext();
  const exactPath = useMatch({
    path,
    caseSensitive: true,
    end: true,
  });

  if (screenSize === ScreenSize.Mobile && !exactPath) {
    return null;
  }

  return children;
}

const SWIPE_EDGE_PX = 32;
const SWIPE_MIN_X_PX = 80;
const SWIPE_MAX_Y_PX = 60;
const SWIPE_MAX_MS = 500;

/**
 * Native-style edge swipe (left edge -> swipe right) to go back.
 * Only active on mobile while a drilled-in route (room, lobby, ...) is shown.
 */
export function MobileSwipeBack() {
  const screenSize = useScreenSizeContext();
  const navigate = useNavigate();
  const homeMatch = useMatch({ path: HOME_PATH, caseSensitive: true, end: true });
  const spaceMatch = useMatch({ path: SPACE_PATH, caseSensitive: true, end: true });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, caseSensitive: true, end: true });
  const inboxMatch = useMatch({ path: INBOX_PATH, caseSensitive: true, end: true });

  const canSwipeBack =
    screenSize === ScreenSize.Mobile && !(homeMatch || spaceMatch || exploreMatch || inboxMatch);

  useEffect(() => {
    if (!canSwipeBack) return;
    let startX = -1;
    let startY = -1;
    let startT = 0;

    const onTouchStart = (evt: TouchEvent) => {
      const t = evt.touches[0];
      if (!t || t.clientX > SWIPE_EDGE_PX) {
        startX = -1;
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
    };
    const onTouchEnd = (evt: TouchEvent) => {
      if (startX < 0) return;
      const t = evt.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= SWIPE_MIN_X_PX && dy <= SWIPE_MAX_Y_PX && Date.now() - startT <= SWIPE_MAX_MS) {
        navigate(-1);
      }
      startX = -1;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [canSwipeBack, navigate]);

  return null;
}

const KEYBOARD_OPEN_PX = 120;

/**
 * Tracks the visual viewport so the layout shrinks above the on-screen
 * keyboard (Android `interactive-widget=resizes-content` has spotty WebView
 * support, iOS Safari has none).
 */
export function useMobileViewportHeight(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const vv = window.visualViewport;
    const root = document.getElementById('root');
    if (!vv || !root) return;

    const update = () => {
      const vkb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--feline-vkb-height', `${Math.round(vkb)}px`);
      if (vkb > KEYBOARD_OPEN_PX) root.setAttribute('data-keyboard-open', 'true');
      else root.removeAttribute('data-keyboard-open');
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--feline-vkb-height');
      root.removeAttribute('data-keyboard-open');
    };
  }, [enabled]);
}
