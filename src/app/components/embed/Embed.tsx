import React from 'react';
import { Box } from 'folds';
import { EmbedData } from '../../utils/embed';
import { YouTubeEmbed } from './YouTubeEmbed';
import { SpotifyEmbed } from './SpotifyEmbed';
import { GifEmbed } from './GifEmbed';
import * as css from './Embed.css';

type Props = {
  embeds: EmbedData[];
  ts?: number;
};

export function Embed({ embeds, ts }: Props) {
  if (embeds.length === 0) return null;
  return (
    <Box className={css.EmbedHolder}>
      {embeds.map((e) => {
        if (e.type === 'youtube') {
          return (
            <YouTubeEmbed
              key={e.url}
              videoId={e.videoId}
              embedUrl={e.embedUrl}
              url={e.url}
              ts={ts}
            />
          );
        }
        if (e.type === 'spotify') {
          return <SpotifyEmbed key={e.url} data={e} />;
        }
        return <GifEmbed key={e.url} url={e.url} mediaUrl={e.mediaUrl} />;
      })}
    </Box>
  );
}
