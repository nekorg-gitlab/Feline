import { style } from '@vanilla-extract/css';
import { config, toRem, color } from 'folds';

export const ThreadIndicator = style({
  opacity: config.opacity.P300,

  selectors: {
    'button&': {
      cursor: 'pointer',
    },
    ':hover&': {
      opacity: config.opacity.P500,
    },
  },
});

export const Reply = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
  minWidth: 0,
  maxWidth: '100%',
  minHeight: toRem(20),
  marginBottom: toRem(4),
  padding: `${toRem(2)} ${toRem(6)} ${toRem(2)} 0`,
  borderRadius: config.radii.R300,
  selectors: {
    'button&': {
      cursor: 'pointer',
    },
    '&:hover': {
      backgroundColor: color.Surface.ContainerActive,
    },
  },
});

export const ReplyBend = style({
  position: 'absolute',
  left: toRem(-32),
  top: toRem(10),
  width: toRem(32),
  height: toRem(14),
  boxSizing: 'border-box',
  borderLeft: `2px solid ${color.SurfaceVariant.ContainerLine}`,
  borderTop: `2px solid ${color.SurfaceVariant.ContainerLine}`,
  borderTopLeftRadius: toRem(10),
  opacity: 0.85,
  pointerEvents: 'none',
  selectors: {
    [`${Reply}:hover &`]: {
      opacity: 1,
    },
  },
});

export const ReplyAvatar = style({
  position: 'relative',
  width: toRem(16),
  height: toRem(16),
  borderRadius: config.radii.Pill,
  overflow: 'hidden',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: color.SurfaceVariant.Container,
  fontSize: toRem(8),
});

export const ReplyUsername = style({
  maxWidth: toRem(140),
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
});

export const ReplyContent = style({
  minWidth: 0,
  flexGrow: 1,
  flexShrink: 1,
  opacity: config.opacity.P400,
  selectors: {
    [`${Reply}:hover &`]: {
      opacity: config.opacity.P500,
    },
  },
});
