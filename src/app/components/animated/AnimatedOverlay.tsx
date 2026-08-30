import React, { useEffect, useState } from 'react';
import { Overlay as FoldsOverlay, OverlayBackdrop, OverlayCenter } from 'folds/dist/index.js';
import type { ComponentProps } from 'react';
import { useAnimationDuration } from '../../hooks/useAnimationDuration';

type OverlayProps = ComponentProps<typeof FoldsOverlay>;

export function AnimatedOverlay({ open, children, backdrop, ...props }: OverlayProps) {
  const duration = useAnimationDuration();
  const [mounted, setMounted] = useState(!!open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      if (duration === 0) {
        setMounted(false);
      } else {
        setClosing(true);
        const t = setTimeout(() => {
          setMounted(false);
          setClosing(false);
        }, duration);
        return () => clearTimeout(t);
      }
    }
  }, [open, mounted, duration]);

  if (!mounted) return null;

  const inner = closing ? (
    <div data-closing="true" style={{ display: 'contents' }}>
      {backdrop}
      {children}
    </div>
  ) : (
    <>
      {backdrop}
      {children}
    </>
  );

  return (
    <FoldsOverlay open {...props} data-closing={closing ? 'true' : undefined}>
      {inner}
    </FoldsOverlay>
  );
}

export { OverlayBackdrop, OverlayCenter };
