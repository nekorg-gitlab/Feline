import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const MessageBase = style({
  position: 'relative',
});
export const MessageBaseBubbleCollapsed = style({
  paddingTop: 0,
});

export const SwipeReplyHint = style([
  DefaultReset,
  {
    position: 'absolute',
    left: toRem(2),
    top: '50%',
    width: toRem(28),
    height: toRem(28),
    marginTop: toRem(-14),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
]);

export const MessageOptionsBase = style([
  DefaultReset,
  {
    position: 'absolute',
    top: toRem(-30),
    right: 0,
    zIndex: 1,
  },
]);
export const MessageOptionsBar = style([
  DefaultReset,
  {
    padding: config.space.S100,
  },
]);

export const BubbleAvatarBase = style({
  paddingTop: 0,
});

export const MessageReplyIndent = style({
  paddingLeft: toRem(48),
  paddingBottom: toRem(2),

  '@media': {
    'screen and (max-width: 750px)': {
      paddingLeft: toRem(28),
    },
  },
});

export const MessageAvatar = style({
  cursor: 'pointer',
  // Keep the 32px avatar button from inheriting the global coarse-pointer
  // 40px button min-height, which would offset the avatar below the name.
  minHeight: 0,
});

export const MessageQuickReaction = style({
  minWidth: toRem(32),
});

export const MessageMenuGroup = style({
  padding: config.space.S100,
});

export const MessageMenuItemText = style({
  flexGrow: 1,
});

export const ReactionsContainer = style({
  selectors: {
    '&:empty': {
      display: 'none',
    },
  },
});

export const ReactionsTooltipText = style({
  wordBreak: 'break-word',
});
