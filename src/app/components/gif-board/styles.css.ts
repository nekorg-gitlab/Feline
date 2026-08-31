import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const Base = style({
  width: `calc(100vw - 2 * ${config.space.S400})`,
  maxWidth: toRem(432),
  height: toRem(450),
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E200,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export const Header = style({
  padding: config.space.S300,
  paddingBottom: 0,
});

export const Grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: config.space.S200,
});

export const GifItem = style({
  border: 'none',
  padding: 0,
  background: color.Surface.Container,
  borderRadius: config.radii.R300,
  overflow: 'hidden',
  cursor: 'pointer',
  height: toRem(140),
  selectors: {
    '&:hover': {
      opacity: 0.9,
    },
  },
});

export const GifImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});
