import React, { useEffect, useState } from 'react';
import { Box, Button, Icon, Icons, Text, config, toRem } from 'folds';
import * as css from './Embed.css';
import { SpotifyEmbed as SpotifyData } from '../../utils/embed';

type Props = {
  data: SpotifyData;
};

type OEmbed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  provider_name?: string;
};

export function SpotifyEmbed({ data }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [oembed, setOembed] = useState<OEmbed | null>(null);
  const [imgError, setImgError] = useState(false);
  const isLarge = data.kind === 'playlist' || data.kind === 'album';
  const frameClass = isLarge ? css.SpotifyFrameLarge : css.SpotifyFrame;

  useEffect(() => {
    let cancelled = false;
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(data.url)}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setOembed(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.url]);

  const title = oembed?.title || data.kind.charAt(0).toUpperCase() + data.kind.slice(1);
  const artist = oembed?.author_name;
  const thumb = !imgError ? oembed?.thumbnail_url : undefined;

  if (loaded) {
    return (
      <Box className={css.EmbedCard} direction="Column">
        <iframe
          className={frameClass}
          src={data.embedUrl}
          title={`Spotify ${data.kind}`}
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="encrypted-media"
          loading="lazy"
        />
        <Box className={css.EmbedMeta}>
          <Text size="T200" priority="300" truncate>
            {title}
            {artist ? ` · ${artist}` : ''}
          </Text>
          <Button
            variant="Secondary"
            size="300"
            radii="300"
            as="a"
            href={data.url}
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
    <Box
      style={{
        width: '100%',
        maxWidth: toRem(400),
        borderRadius: config.radii.R400,
        overflow: 'hidden',
        backgroundColor: '#7a3b0a',
        background: 'linear-gradient(135deg, #8b3a08 0%, #7a2e0a 100%)',
        border: `1px solid #5a2a06`,
        display: 'flex',
        flexDirection: 'row',
        gap: config.space.S300,
        padding: config.space.S300,
        alignItems: 'center',
      }}
    >
      <Box
        shrink="No"
        style={{
          width: toRem(80),
          height: toRem(80),
          borderRadius: config.radii.R300,
          overflow: 'hidden',
          backgroundColor: '#111',
          flexShrink: 0,
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <Box
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#111',
            }}
          >
            <Icon size="300" src={Icons.Vlc} style={{ color: '#1DB954' }} />
          </Box>
        )}
      </Box>
      <Box direction="Column" gap="100" grow="Yes" style={{ minWidth: 0 }}>
        <Text size="T400" priority="400" truncate style={{ color: 'white', fontWeight: 700 }}>
          {title}
        </Text>
        {artist && (
          <Text size="T200" priority="300" truncate style={{ color: '#e8c4a0' }}>
            {artist}
          </Text>
        )}
        <Box alignItems="Center" gap="200" style={{ marginTop: config.space.S100 }}>
          <Box
            as="button"
            onClick={() => setLoaded(true)}
            style={{
              backgroundColor: '#4a1f02',
              color: 'white',
              border: `1px solid #6b2f08`,
              borderRadius: config.radii.R300,
              padding: `2px ${config.space.S200}`,
              cursor: 'pointer',
              fontSize: toRem(12),
              fontWeight: 600,
            }}
          >
            Preview
          </Box>
        </Box>
      </Box>
      <Box
        direction="Column"
        alignItems="End"
        gap="200"
        shrink="No"
        style={{ alignSelf: 'stretch' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02Zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2Zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3Z" />
        </svg>
        <Box alignItems="Center" gap="200" style={{ marginTop: 'auto' }}>
          <Box
            as="button"
            onClick={() => setLoaded(true)}
            style={{
              width: toRem(28),
              height: toRem(28),
              borderRadius: '50%',
              border: `1.5px solid white`,
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
            aria-label="Add"
          >
            <Icon size="100" src={Icons.Plus} style={{ color: 'white' }} />
          </Box>
          <Text size="T200" style={{ color: 'white', opacity: 0.9 }}>
            •••
          </Text>
          <Box
            as="button"
            onClick={() => setLoaded(true)}
            style={{
              width: toRem(36),
              height: toRem(36),
              borderRadius: '50%',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
            }}
            aria-label="Play"
          >
            <Icon size="100" src={Icons.Play} style={{ color: '#7a3b0a' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
