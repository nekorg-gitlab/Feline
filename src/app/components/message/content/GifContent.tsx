import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Spinner, Text, as } from 'folds';
import classNames from 'classnames';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IThumbnailContent, IVideoInfo } from '../../../../types/matrix/common';
import * as css from './style.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { downloadMxc } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';

type GifContentProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IVideoInfo & IThumbnailContent;
  encInfo?: EncryptedAttachmentInfo;
};

export const GifContent = as<'div', GifContentProps>(
  ({ className, body, mimeType, url, info, encInfo, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(async () => {
        const fileContent = await downloadMxc(mx, url, useAuthentication, mimeType, encInfo);
        return URL.createObjectURL(fileContent);
      }, [mx, url, useAuthentication, mimeType, encInfo]),
    );

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Some WebViews (e.g. Android) block autoplay until a user gesture.
    // In that case show native controls so one tap starts the GIF.
    const [needsGesture, setNeedsGesture] = useState(false);

    const tryPlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const play = video.play();
        if (play) play.catch(() => setNeedsGesture(true));
      } catch {
        setNeedsGesture(true);
      }
    }, []);

    const handleIntersection = useCallback(
      (entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) {
          tryPlay();
        } else {
          video.pause();
        }
      },
      [tryPlay],
    );

    useIntersectionObserver(handleIntersection, { threshold: 0.1 }, () => containerRef.current);

    useEffect(() => {
      loadSrc();
    }, [loadSrc]);

    useEffect(() => {
      return () => {
        if (srcState.status === AsyncStatus.Success && srcState.data) {
          URL.revokeObjectURL(srcState.data);
        }
      };
    }, [srcState]);

    return (
      <Box
        className={classNames(css.RelativeBase, className)}
        {...props}
        ref={(node: HTMLDivElement) => {
          (containerRef as any).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as any).current = node;
        }}
      >
        {srcState.status === AsyncStatus.Success && (
          <Box className={css.AbsoluteContainer}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={srcState.data}
              title={body}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              controls={needsGesture}
              onPlaying={() => setNeedsGesture(false)}
              onClick={tryPlay}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </Box>
        )}
        {(srcState.status === AsyncStatus.Loading || srcState.status === AsyncStatus.Idle) && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Spinner variant="Secondary" />
          </Box>
        )}
        {srcState.status === AsyncStatus.Error && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Text size="T300">Failed to load GIF</Text>
          </Box>
        )}
      </Box>
    );
  },
);
