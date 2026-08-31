import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import {
  Box,
  Icon,
  IconButton,
  Icons,
  Scroll,
  Spinner,
  Text,
  as,
  color,
  config,
  toRem,
} from 'folds';
import { ImageOverlay } from '../ImageOverlay';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { UrlPreview, UrlPreviewContent, UrlPreviewDescription, UrlPreviewImg } from './UrlPreview';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import * as css from './UrlPreviewCard.css';
import { tryDecodeURIComponent } from '../../utils/dom';
import { mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ImageViewer } from '../image-viewer';
import { onEnterOrSpace } from '../../utils/keyboard';

const linkStyles = { color: color.Success.Main };

const GitLabLogoFallback = () => (
  <svg width="48" height="48" viewBox="0 0 380 380" aria-hidden>
    <path
      fill="#E24329"
      d="M265.26 174.37l-.21-.56-21.2-55.31a5 5 0 0 0-2.18-2.63 5 5 0 0 0-3.32-.87 5 5 0 0 0-3.21 1.22 5 5 0 0 0-1.87 2.85l-14.31 43.81h-57.91l-14.31-43.81a5 5 0 0 0-1.87-2.85 5 5 0 0 0-3.21-1.22 5 5 0 0 0-3.32.87 5 5 0 0 0-2.18 2.63l-21.2 55.31-.21.55c-6.28 16.39-.93 34.91 13.06 45.49l.08.06.19.14 32.29 24.17 15.97 12.09 9.72 7.35a7 7 0 0 0 7.92 0l9.72-7.35 15.97-12.09 32.48-24.32.09-.06c13.98-10.58 19.33-29.1 13.05-45.48Z"
    />
    <path
      fill="#FC6D26"
      d="M265.26 174.37l-.21-.56c-10.52 2.16-20.2 6.61-28.5 12.82-.13.1-25.2 19.06-46.55 35.2 15.85 11.99 29.65 22.4 29.65 22.4l32.48-24.32.09-.06c13.98-10.58 19.33-29.1 13.05-45.48Z"
    />
    <path
      fill="#FCA326"
      d="M160.35 244.23l15.97 12.09 9.72 7.35a7 7 0 0 0 7.92 0l9.72-7.35 15.97-12.09s-13.8-10.42-29.65-22.4c-15.85 11.99-29.65 22.4-29.65 22.4Z"
    />
    <path
      fill="#FC6D26"
      d="M143.45 186.63c-8.29-6.2-17.97-10.65-28.5-12.81l-.21.55c-6.28 16.39-.93 34.91 13.06 45.49l.08.06.19.14 32.29 24.17s13.8-10.42 29.65-22.4c-21.35-16.14-46.42-35.1-46.55-35.2Z"
    />
  </svg>
);

export const UrlPreviewCard = as<'div', { url: string; ts: number }>(
  ({ url, ts, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const [viewer, setViewer] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [previewStatus, loadPreview] = useAsyncCallback(
      useCallback(() => mx.getUrlPreview(url, ts), [url, ts, mx]),
    );

    useEffect(() => {
      loadPreview();
    }, [loadPreview]);

    useEffect(() => {
      setImgError(false);
    }, [url]);

    if (previewStatus.status === AsyncStatus.Error) return null;

    const renderContent = (prev: IPreviewUrlResponse) => {
      const isGitHost = (() => {
        try {
          const h = new URL(url).hostname.toLowerCase();
          return (
            h === 'github.com' ||
            h.endsWith('.github.com') ||
            h === 'gitlab.com' ||
            h.endsWith('.gitlab.com')
          );
        } catch {
          return false;
        }
      })();

      if (isGitHost) {
        const rawTitle = typeof prev['og:title'] === 'string' ? prev['og:title'] : '';
        const siteName = typeof prev['og:site_name'] === 'string' ? prev['og:site_name'] : '';
        const description =
          typeof prev['og:description'] === 'string' ? prev['og:description'].trim() : '';
        const isGenericDesc =
          !description || /^GitLab\.com$/i.test(description) || /^GitHub$/i.test(description);
        const hostLabel = (() => {
          try {
            return new URL(url).hostname.replace(/^www\./, '');
          } catch {
            return '';
          }
        })();
        const isGitLab = hostLabel.toLowerCase().includes('gitlab');
        const isGitHub = hostLabel.toLowerCase().includes('github');
        const displayTitle = rawTitle || (isGitLab ? 'GitLab' : isGitHub ? 'GitHub' : hostLabel);
        const displaySite = siteName || (isGitLab ? 'GitLab' : isGitHub ? 'GitHub' : hostLabel);
        const thumbUrlSmall = mxcUrlToHttp(
          mx,
          prev['og:image'] || '',
          useAuthentication,
          160,
          160,
          'crop',
        );
        const thumbUrlLarge = mxcUrlToHttp(
          mx,
          prev['og:image'] || '',
          useAuthentication,
          640,
          320,
          'scale',
        );
        const hasThumbSmall = Boolean(thumbUrlSmall) && !imgError;
        const hasThumbLarge = Boolean(thumbUrlLarge) && !imgError;

        if (isGitHub) {
          return (
            <Box
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: config.space.S200,
                padding: `${config.space.S300} ${config.space.S400}`,
                borderLeft: `4px solid #24292f`,
                width: '100%',
              }}
            >
              <Text size="T200" priority="300">
                {displaySite || 'GitHub'}
              </Text>
              <Text
                as="a"
                href={url}
                target="_blank"
                rel="noreferrer"
                size="H6"
                priority="400"
                style={{ color: '#0a66c2' }}
              >
                <b>{displayTitle}</b>
              </Text>
              <Text size="T300" priority="300">
                <UrlPreviewDescription>
                  {isGenericDesc ? 'GitHub' : description}
                </UrlPreviewDescription>
              </Text>
              {hasThumbLarge && (
                <Box
                  style={{
                    width: '100%',
                    borderRadius: config.radii.R300,
                    overflow: 'hidden',
                    border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
                    marginTop: config.space.S100,
                  }}
                >
                  <img
                    src={thumbUrlLarge!}
                    alt={displayTitle}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      maxHeight: toRem(220),
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                    onError={() => setImgError(true)}
                  />
                </Box>
              )}
              {!hasThumbLarge && (
                <Box
                  style={{
                    width: '100%',
                    height: toRem(140),
                    borderRadius: config.radii.R300,
                    backgroundColor: '#24292f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: config.space.S100,
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white" aria-hidden>
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.304 3.492.997.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.22-.124-.304-.54-1.524.116-3.177 0 0 1.007-.322 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.552 3.296-1.23 3.296-1.23.656 1.653.246 2.873.122 3.177.77.839 1.232 1.91 1.232 3.22 0 4.61-2.807 5.624-5.475 5.92.43.37.814 1.096.814 2.22 0 1.603-.015 2.896-.015 3.286 0 .32.216.694.825.576C20.566 21.994 24 17.498 24 12.297 24 5.67 18.627.297 12 .297Z" />
                  </svg>
                </Box>
              )}
            </Box>
          );
        }

        const hasThumb = hasThumbSmall;
        const thumbUrl = thumbUrlSmall;
        return (
          <Box
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: config.space.S400,
              padding: `${config.space.S300} ${config.space.S400}`,
              borderLeft: `4px solid #FC6D26`,
              width: '100%',
            }}
          >
            <Box direction="Column" gap="100" grow="Yes" style={{ minWidth: 0 }}>
              <Text size="T200" priority="300">
                {displaySite}
              </Text>
              <Text
                as="a"
                href={url}
                target="_blank"
                rel="noreferrer"
                size="H6"
                priority="400"
                truncate
                style={{ color: '#0a66c2' }}
              >
                <b>{displayTitle}</b>
              </Text>
              {!isGenericDesc ? (
                <Text size="T300" priority="300">
                  <UrlPreviewDescription>{description}</UrlPreviewDescription>
                </Text>
              ) : (
                <Text size="T300" priority="300">
                  {hostLabel}
                </Text>
              )}
            </Box>
            <Box
              shrink="No"
              style={{
                width: toRem(80),
                height: toRem(80),
                borderRadius: config.radii.R400,
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: hasThumb ? undefined : '#fff',
                border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
              }}
            >
              {hasThumb ? (
                <img
                  src={thumbUrl!}
                  alt={displayTitle}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                <GitLabLogoFallback />
              )}
            </Box>
          </Box>
        );
      }

      const thumbUrl = mxcUrlToHttp(
        mx,
        prev['og:image'] || '',
        useAuthentication,
        256,
        256,
        'scale',
        false,
      );

      const imgUrl = mxcUrlToHttp(mx, prev['og:image'] || '', useAuthentication);

      return (
        <>
          {thumbUrl && (
            <UrlPreviewImg
              src={thumbUrl}
              alt={prev['og:title']}
              title={prev['og:title']}
              tabIndex={0}
              onKeyDown={(evt) => onEnterOrSpace(() => setViewer(true))(evt)}
              onClick={() => setViewer(true)}
            />
          )}
          {imgUrl && (
            <ImageOverlay
              src={imgUrl}
              alt={prev['og:title']}
              viewer={viewer}
              requestClose={() => {
                setViewer(false);
              }}
              renderViewer={(p) => <ImageViewer {...p} />}
            />
          )}
          <UrlPreviewContent>
            <Text
              style={linkStyles}
              truncate
              as="a"
              href={url}
              target="_blank"
              rel="noreferrer"
              size="T200"
              priority="300"
            >
              {typeof prev['og:site_name'] === 'string' && `${prev['og:site_name']} | `}
              {tryDecodeURIComponent(url)}
            </Text>
            <Text truncate priority="400">
              <b>{prev['og:title']}</b>
            </Text>
            <Text size="T200" priority="300">
              <UrlPreviewDescription>{prev['og:description']}</UrlPreviewDescription>
            </Text>
          </UrlPreviewContent>
        </>
      );
    };

    return (
      <UrlPreview {...props} ref={ref}>
        {previewStatus.status === AsyncStatus.Success ? (
          renderContent(previewStatus.data)
        ) : (
          <Box grow="Yes" alignItems="Center" justifyContent="Center">
            <Spinner variant="Secondary" size="400" />
          </Box>
        )}
      </UrlPreview>
    );
  },
);

export const UrlPreviewHolder = as<'div'>(({ children, ...props }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const backAnchorRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const frontAnchorRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const [backVisible, setBackVisible] = useState(true);
  const [frontVisible, setFrontVisible] = useState(true);

  const intersectionObserver = useIntersectionObserver(
    useCallback((entries) => {
      const backAnchor = backAnchorRef.current;
      const frontAnchor = frontAnchorRef.current;
      const backEntry = backAnchor && getIntersectionObserverEntry(backAnchor, entries);
      const frontEntry = frontAnchor && getIntersectionObserverEntry(frontAnchor, entries);
      if (backEntry) {
        setBackVisible(backEntry.isIntersecting);
      }
      if (frontEntry) {
        setFrontVisible(frontEntry.isIntersecting);
      }
    }, []),
    useCallback(
      () => ({
        root: scrollRef.current,
        rootMargin: '10px',
      }),
      [],
    ),
  );

  useEffect(() => {
    const backAnchor = backAnchorRef.current;
    const frontAnchor = frontAnchorRef.current;
    if (backAnchor) intersectionObserver?.observe(backAnchor);
    if (frontAnchor) intersectionObserver?.observe(frontAnchor);
    return () => {
      if (backAnchor) intersectionObserver?.unobserve(backAnchor);
      if (frontAnchor) intersectionObserver?.unobserve(frontAnchor);
    };
  }, [intersectionObserver]);

  const handleScrollBack = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const { offsetWidth, scrollLeft } = scroll;
    scroll.scrollTo({
      left: scrollLeft - offsetWidth / 1.3,
      behavior: 'smooth',
    });
  };
  const handleScrollFront = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const { offsetWidth, scrollLeft } = scroll;
    scroll.scrollTo({
      left: scrollLeft + offsetWidth / 1.3,
      behavior: 'smooth',
    });
  };

  return (
    <Box
      direction="Column"
      {...props}
      ref={ref}
      style={{ marginTop: config.space.S200, position: 'relative' }}
    >
      <Scroll ref={scrollRef} direction="Horizontal" size="0" visibility="Hover" hideTrack>
        <Box shrink="No" alignItems="Center">
          <div ref={backAnchorRef} />
          {!backVisible && (
            <>
              <div className={css.UrlPreviewHolderGradient({ position: 'Left' })} />
              <IconButton
                className={css.UrlPreviewHolderBtn({ position: 'Left' })}
                variant="Secondary"
                radii="Pill"
                size="300"
                outlined
                onClick={handleScrollBack}
              >
                <Icon size="300" src={Icons.ArrowLeft} />
              </IconButton>
            </>
          )}
          <Box alignItems="Inherit" gap="200">
            {children}

            {!frontVisible && (
              <>
                <div className={css.UrlPreviewHolderGradient({ position: 'Right' })} />
                <IconButton
                  className={css.UrlPreviewHolderBtn({ position: 'Right' })}
                  variant="Primary"
                  radii="Pill"
                  size="300"
                  outlined
                  onClick={handleScrollFront}
                >
                  <Icon size="300" src={Icons.ArrowRight} />
                </IconButton>
              </>
            )}
            <div ref={frontAnchorRef} />
          </Box>
        </Box>
      </Scroll>
    </Box>
  );
});
