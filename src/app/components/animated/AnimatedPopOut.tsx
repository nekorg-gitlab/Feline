import React, { useEffect, useState } from 'react';
import { PopOut as FoldsPopOut } from 'folds/dist/index.js';
import type { ComponentProps } from 'react';
import { useAnimationDuration } from '../../hooks/useAnimationDuration';

type PopOutProps = ComponentProps<typeof FoldsPopOut>;

export function AnimatedPopOut({ anchor, content, children, ...props }: PopOutProps) {
  const duration = useAnimationDuration();
  const [mountedAnchor, setMountedAnchor] = useState(anchor);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (anchor) {
      setMountedAnchor(anchor);
      setClosing(false);
    } else if (mountedAnchor) {
      if (duration === 0) {
        setMountedAnchor(undefined);
      } else {
        setClosing(true);
        const t = setTimeout(() => {
          setMountedAnchor(undefined);
          setClosing(false);
        }, duration);
        return () => clearTimeout(t);
      }
    }
  }, [anchor, mountedAnchor, duration]);

  const effectiveAnchor = anchor ?? mountedAnchor;

  if (!effectiveAnchor) {
    return <>{children}</>;
  }

  const innerContent = closing ? (
    <div data-closing="true" style={{ display: 'contents' }}>
      {content}
    </div>
  ) : (
    content
  );

  return (
    <FoldsPopOut
      anchor={effectiveAnchor as any}
      content={innerContent}
      {...(props as any)}
      data-closing={closing ? 'true' : undefined}
    >
      {children}
    </FoldsPopOut>
  );
}
