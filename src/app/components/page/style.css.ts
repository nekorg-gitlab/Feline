import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';
import { mobileScreenMedia, compactHeightMedia } from '../../styles/media';

export const PageNav = recipe({
  variants: {
    size: {
      '400': {
        width: toRem(256),
      },
      '300': {
        width: toRem(222),
      },
    },
  },
  defaultVariants: {
    size: '400',
  },
});
export type PageNavVariants = RecipeVariants<typeof PageNav>;

export const PageNavHeader = recipe({
  base: {
    padding: `env(safe-area-inset-top, 0px) ${config.space.S200} 0 ${config.space.S300}`,
    flexShrink: 0,
    '@media': {
      [mobileScreenMedia]: {
        // folds Header size="600" fixes height at 54px; on mobile the
        // status-bar inset padding would crush content, so grow instead.
        selectors: {
          'header&': {
            height: 'auto',
            minHeight: 'calc(3.375rem + env(safe-area-inset-top, 0px))',
          },
        },
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${config.space.S200})`,
        paddingRight: config.space.S400,
        paddingBottom: config.space.S200,
        paddingLeft: config.space.S400,
      },
      // Compact height (landscape phones): the WebView keeps reporting the
      // portrait cutout inset for the top, so cap it at status-bar size.
      [compactHeightMedia]: {
        selectors: {
          'header&': {
            minHeight: 'calc(3.375rem + min(env(safe-area-inset-top, 0px), 28px))',
          },
        },
        paddingTop: `calc(min(env(safe-area-inset-top, 0px), 28px) + ${config.space.S200})`,
      },
    },
    selectors: {
      'button&': {
        cursor: 'pointer',
      },
      'button&[aria-pressed=true]': {
        backgroundColor: color.Background.ContainerActive,
      },
      'button&:hover, button&:focus-visible': {
        backgroundColor: color.Background.ContainerHover,
      },
      'button&:active': {
        backgroundColor: color.Background.ContainerActive,
      },
    },
  },

  variants: {
    outlined: {
      true: {
        borderBottomWidth: 'var(--feline-divider-width, 1px)',
      },
    },
  },
  defaultVariants: {
    outlined: true,
  },
});
export type PageNavHeaderVariants = RecipeVariants<typeof PageNavHeader>;

export const PageNavContent = style({
  minHeight: '100%',
  padding: config.space.S200,
  paddingRight: 0,
  paddingBottom: config.space.S700,

  '@media': {
    [mobileScreenMedia]: {
      padding: `${config.space.S200} ${config.space.S400}`,
      paddingBottom:
        'calc(var(--feline-tabbar-height, 60px) + env(safe-area-inset-bottom, 0px) + 16px)',
    },
  },
});

export const PageHeader = recipe({
  base: {
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingLeft: config.space.S400,
    paddingRight: config.space.S200,
    '@media': {
      [mobileScreenMedia]: {
        selectors: {
          'header&': {
            height: 'auto',
            minHeight: 'calc(3.375rem + env(safe-area-inset-top, 0px))',
          },
        },
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${config.space.S200})`,
        paddingRight: `max(${config.space.S400}, env(safe-area-inset-right, 0px))`,
        paddingBottom: config.space.S200,
      },
      // Compact height (landscape phones): the WebView keeps reporting the
      // portrait cutout inset for the top, so cap it at status-bar size.
      [compactHeightMedia]: {
        selectors: {
          'header&': {
            minHeight: 'calc(3.375rem + min(env(safe-area-inset-top, 0px), 28px))',
          },
        },
        paddingTop: `calc(min(env(safe-area-inset-top, 0px), 28px) + ${config.space.S200})`,
      },
    },
  },
  variants: {
    balance: {
      true: {
        paddingLeft: config.space.S200,
      },
    },
    outlined: {
      true: {
        borderBottomWidth: 'var(--feline-divider-width, 1px)',
      },
    },
  },
  defaultVariants: {
    outlined: true,
  },
});
export type PageHeaderVariants = RecipeVariants<typeof PageHeader>;

export const PageContent = style([
  DefaultReset,
  {
    paddingTop: config.space.S400,
    paddingLeft: config.space.S400,
    paddingRight: 0,
    paddingBottom: toRem(100),

    '@media': {
      [mobileScreenMedia]: {
        paddingLeft: config.space.S400,
        paddingRight: config.space.S400,
      },
    },
  },
]);

export const PageHeroEmpty = style([
  DefaultReset,
  {
    padding: config.space.S400,
    borderRadius: config.radii.R400,
    minHeight: toRem(450),

    '@media': {
      [mobileScreenMedia]: {
        minHeight: toRem(280),
      },
    },
  },
]);

export const PageHeroSection = style([
  DefaultReset,
  {
    padding: '40px 0',
    maxWidth: toRem(466),
    width: '100%',
    margin: 'auto',
  },
]);

export const PageContentCenter = style([
  DefaultReset,
  {
    maxWidth: toRem(964),
    width: '100%',
    margin: 'auto',
  },
]);

export const Page = style({
  borderRadius: 0,
  overflow: 'hidden',
  isolation: 'isolate',
  backgroundColor: color.Surface.Container,
});

export const ChatPane = style({
  borderRadius: 0,
  overflow: 'hidden',
  isolation: 'isolate',
  backgroundColor: color.Surface.Container,
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
});
