import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const AuthLayout = style({
  minHeight: ['100vh', '100dvh'],
  maxHeight: ['100vh', '100dvh'],
  overflowY: 'auto',
  scrollbarWidth: 'none',
  // @ts-ignore - msOverflowStyle for IE/Edge legacy
  msOverflowStyle: 'none',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
  padding: config.space.S400,
  // Status zone + a full clear gap: no content may sit adjacent to
  // (let alone under) the camera/clock/battery, at rest or while scrolling.
  paddingTop: `calc(${config.space.S400} + env(safe-area-inset-top, 0px) + ${toRem(32)})`,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  position: 'relative',
  // NOTE: no justify-content here on purpose. The card's auto margins center
  // it when content fits; `center` would push overflowing content up under
  // the camera on scroll (classic flexbox centering trap).
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  '@media': {
    'screen and (max-width: 750px)': {
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
});

export const AuthCard = style({
  margin: 'auto 0',
  maxWidth: toRem(460),
  width: '100%',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E100,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
  '@media': {
    'screen and (max-width: 750px)': {
      margin: 0,
      maxWidth: '100%',
      flexGrow: 1,
      // No card chrome on phones: the form IS the screen.
      backgroundColor: 'transparent',
      color: color.Background.OnContainer,
      border: 'none',
      borderRadius: 0,
      boxShadow: 'none',
    },
  },
});

export const AuthLogo = style([
  DefaultReset,
  {
    width: toRem(26),
    height: toRem(26),

    borderRadius: '50%',
  },
]);

export const AuthHeader = style({
  padding: `0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
  '@media': {
    // Phones keep the logo row as plain content: no bar background, no divider.
    // `header&` outranks folds' variant class regardless of injection order.
    'screen and (max-width: 750px)': {
      selectors: {
        'header&': {
          backgroundColor: 'transparent',
          borderBottom: 'none',
        },
      },
    },
  },
});

export const AuthCardContent = style({
  maxWidth: toRem(402),
  width: '100%',
  margin: 'auto',
  padding: config.space.S400,
  paddingTop: config.space.S700,
  paddingBottom: toRem(44),
  gap: toRem(44),
});

export const AuthFooter = style({
  padding: config.space.S200,
});
