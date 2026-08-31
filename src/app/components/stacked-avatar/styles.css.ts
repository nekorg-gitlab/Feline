import { ComplexStyleRule, createVar } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { color, config, ContainerColor, toRem } from 'folds';

const outlineWidth = createVar();
const outlineColor = createVar();

const getVariant = (variant: ContainerColor): ComplexStyleRule => ({
  vars: {
    [outlineColor]: color[variant].Container,
  },
});

export const StackedAvatar = recipe({
  base: {
    vars: {
      [outlineWidth]: config.borderWidth.B500,
      [outlineColor]: color.Surface.Container,
    },
    backgroundColor: color.Surface.Container,
    boxShadow: `0 0 0 ${outlineWidth} ${outlineColor}`,
    selectors: {
      '&:first-child': {
        marginLeft: 0,
      },
      'button&': {
        cursor: 'pointer',
      },
    },
  },

  variants: {
    size: {
      '200': {
        vars: {
          [outlineWidth]: config.borderWidth.B300,
        },
        marginLeft: toRem(-6),
      },
      '300': {
        vars: {
          [outlineWidth]: config.borderWidth.B400,
        },
        marginLeft: toRem(-9),
      },
      '400': {
        vars: {
          [outlineWidth]: config.borderWidth.B500,
        },
        marginLeft: toRem(-10.5),
      },
      '500': {
        vars: {
          [outlineWidth]: config.borderWidth.B600,
        },
        marginLeft: toRem(-13),
      },
    },
    variant: {
      Background: getVariant('Background'),
      Surface: getVariant('Surface'),
      SurfaceVariant: getVariant('SurfaceVariant'),
      Primary: getVariant('Primary'),
      Secondary: getVariant('Secondary'),
      Success: getVariant('Success'),
      Warning: getVariant('Warning'),
      Critical: getVariant('Critical'),
    },
  },
  defaultVariants: {
    size: '400',
    variant: 'Surface',
  },
});

export type StackedAvatarVariants = RecipeVariants<typeof StackedAvatar>;
