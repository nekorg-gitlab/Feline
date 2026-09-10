import { style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';
import { mobileScreenMedia } from '../../../styles/media';

export const Attachment = recipe({
  base: {
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderRadius: config.radii.R400,
    overflow: 'hidden',
    maxWidth: '100%',
    width: toRem(400),

    '@media': {
      [mobileScreenMedia]: {
        // Percentage widths collapse to zero inside shrink-to-fit parents
        // (e.g. chat bubbles), so keep a definite floor. Replies only ever
        // render text previews, so this can't blow out reply layouts.
        width: '100%',
        minWidth: toRem(240),
      },
    },
  },
  variants: {
    outlined: {
      true: {
        boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
      },
    },
  },
});

export type AttachmentVariants = RecipeVariants<typeof Attachment>;

export const AttachmentHeader = style({
  padding: config.space.S300,
});

export const AttachmentBox = style([
  DefaultReset,
  {
    maxWidth: '100%',
    maxHeight: toRem(600),
    width: toRem(400),
    overflow: 'hidden',

    '@media': {
      [mobileScreenMedia]: {
        width: '100%',
        maxHeight: '50vh',
      },
    },
  },
]);

export const AttachmentContent = style({
  padding: config.space.S300,
  paddingTop: 0,
});
