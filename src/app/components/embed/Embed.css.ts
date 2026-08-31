import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const EmbedHolder = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S200,
  marginTop: config.space.S200,
  maxWidth: '100%',
});

export const EmbedCard = style({
  width: '100%',
  maxWidth: toRem(480),
  borderRadius: config.radii.R300,
  overflow: 'hidden',
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  backgroundColor: color.SurfaceVariant.Container,
});

export const EmbedPreview = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  backgroundColor: color.SurfaceVariant.Container,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: 'none',
  padding: 0,
});

export const EmbedThumb = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const EmbedPlayButton = style({
  position: 'absolute',
  width: toRem(56),
  height: toRem(56),
  borderRadius: '50%',
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.85)',
    },
  },
});

export const EmbedFrame = style({
  width: '100%',
  aspectRatio: '16 / 9',
  border: 'none',
  display: 'block',
});

export const SpotifyFrame = style({
  width: '100%',
  height: toRem(152),
  border: 'none',
  display: 'block',
});

export const SpotifyFrameLarge = style({
  width: '100%',
  height: toRem(352),
  border: 'none',
  display: 'block',
});

export const GifMedia = style({
  maxWidth: '100%',
  maxHeight: toRem(320),
  borderRadius: config.radii.R300,
  display: 'block',
  objectFit: 'contain',
});

export const GifHolder = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
  maxWidth: toRem(360),
});

export const EmbedMeta = style({
  padding: `${config.space.S200} ${config.space.S300}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: config.space.S200,
});
