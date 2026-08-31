import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import * as css from './Embed.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';

type Props = {
  videoId: string;
  embedUrl: string;
  url: string;
  ts?: number;
};

export function YouTubeEmbed({ videoId, embedUrl, url, ts }: Props) {
  const [loaded, setLoaded] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const mx = useMatrixClient();
  const [previewStatus, loadPreview] = useAsyncCallback(
    useCallback(() => mx.getUrlPreview(url, ts ?? Date.now()), [mx, url, ts]),
  );
  const [oembedTitle, setOembedTitle] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (previewStatus.status !== AsyncStatus.Error) return;
    let cancelled = false;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    fetch(oembedUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.title) setOembedTitle(data.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [previewStatus.status, url]);

  const title =
    previewStatus.status === AsyncStatus.Success
      ? (previewStatus.data['og:title'] as string) || oembedTitle || url
      : oembedTitle || url;

  if (loaded) {
    return (
      <Box className={css.EmbedCard} direction="Column">
        <iframe
          className={css.EmbedFrame}
          src={embedUrl}
          title="YouTube video"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <Box className={css.EmbedMeta}>
          <Text size="T300" priority="400" truncate title={title}>
            {title}
          </Text>
          <Button
            variant="Secondary"
            size="300"
            radii="300"
            as="a"
            href={url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Text size="B300">Open</Text>
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={css.EmbedCard} direction="Column">
      <button
        type="button"
        className={css.EmbedPreview}
        onClick={() => setLoaded(true)}
        aria-label="Show YouTube embed"
      >
        <img className={css.EmbedThumb} src={thumb} alt={title} title={title} loading="lazy" />
        <span className={css.EmbedPlayButton} aria-hidden>
          <Icon src={Icons.Play} size="400" style={{ color: 'white', marginLeft: 2 }} />
        </span>
      </button>
      <Box className={css.EmbedMeta}>
        <Text size="T300" priority="400" truncate title={title}>
          {title}
        </Text>
        <Button size="300" variant="Primary" radii="300" onClick={() => setLoaded(true)}>
          <Text size="B300">Show embed</Text>
        </Button>
      </Box>
    </Box>
  );
}
