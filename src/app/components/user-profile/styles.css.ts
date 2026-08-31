import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const UserHeader = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1,
  padding: config.space.S200,
});

export const UserHero = style({
  position: 'relative',
});

export const UserHeroCoverContainer = style({
  height: toRem(96),
  overflow: 'hidden',
});
export const UserHeroCover = style({
  height: '100%',
  width: '100%',
  objectFit: 'cover',
  filter: 'blur(16px)',
  transform: 'scale(2)',
});

export const UserHeroAvatarContainer = style({});
export const UserAvatarContainer = style({
  display: 'inline-flex',
  backgroundColor: color.Surface.Container,
  borderRadius: config.radii.R400,
  overflow: 'hidden',
  isolation: 'isolate',
});
export const UserHeroAvatar = style({
  borderRadius: config.radii.R400,
  overflow: 'hidden',
  boxShadow: `0 0 0 ${config.borderWidth.B600} ${color.Surface.Container}`,
  selectors: {
    'button&': {
      cursor: 'pointer',
    },
  },
});
export const UserHeroAvatarImg = style({
  selectors: {
    [`button${UserHeroAvatar}:hover &`]: {
      filter: 'brightness(0.5)',
    },
  },
});
