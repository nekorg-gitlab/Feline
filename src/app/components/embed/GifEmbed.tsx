import React, { useState } from 'react';
import { Box, Button, Text } from 'folds';
import * as css from './Embed.css';

type Props = {
  url: string;
  mediaUrl: string;
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?.*)?$/i.test(url);
}

export function GifEmbed({ url, mediaUrl }: Props) {
  const isVideo = isVideoUrl(mediaUrl);
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Box className={css.GifHolder}>
        <Button size="300" variant="Secondary" radii="300" onClick={() => setShow(true)}>
          <Text size="B300">Show GIF</Text>
        </Button>
        <Text
          size="T200"
          priority="300"
          as="a"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
        >
          {url}
        </Text>
      </Box>
    );
  }

  if (isVideo) {
    return (
      <Box className={css.GifHolder}>
        <video
          className={css.GifMedia}
          src={mediaUrl}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
        />
        <Text
          size="T200"
          priority="300"
          as="a"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open original
        </Text>
      </Box>
    );
  }

  return (
    <Box className={css.GifHolder}>
      <img className={css.GifMedia} src={mediaUrl} alt="GIF" loading="lazy" />
      <Text size="T200" priority="300" as="a" href={url} target="_blank" rel="noreferrer noopener">
        Open original
      </Text>
    </Box>
  );
}
