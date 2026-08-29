import { AvatarFallback, AvatarImage, color } from 'folds';
import React, { ReactEventHandler, ReactNode, useEffect, useState } from 'react';
import classNames from 'classnames';
import * as css from './UserAvatar.css';
import { getThumbnailFallbackUrl } from '../../utils/matrix';
import colorMXID from '../../../util/colorMXID';

type UserAvatarProps = {
  className?: string;
  userId: string;
  src?: string;
  alt?: string;
  renderFallback: () => ReactNode;
};
export function UserAvatar({ className, userId, src, alt, renderFallback }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackTried, setFallbackTried] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setFallbackTried(false);
    setError(false);
  }, [src]);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

  const handleError = () => {
    if (!fallbackTried && currentSrc) {
      const fallback = getThumbnailFallbackUrl(currentSrc);
      if (fallback && fallback !== currentSrc) {
        setFallbackTried(true);
        setCurrentSrc(fallback);
        return;
      }
    }
    setError(true);
  };

  if (!currentSrc || error) {
    return (
      <AvatarFallback
        style={{ backgroundColor: colorMXID(userId), color: color.Surface.Container }}
        className={classNames(css.UserAvatar, className)}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  return (
    <AvatarImage
      className={classNames(css.UserAvatar, className)}
      src={currentSrc}
      alt={alt}
      onError={handleError}
      onLoad={handleLoad}
      draggable={false}
    />
  );
}
