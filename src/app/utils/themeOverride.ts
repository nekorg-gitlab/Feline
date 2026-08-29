import chroma from 'chroma-js';
import { color } from 'folds';
import type { CustomThemeColorGroup } from '../state/settings';

const THEME_OVERRIDE_STYLE_ID = 'feline-theme-override';

const getVarName = (tokenRef: string): string => {
  const match = /var\((--[^)]+)\)/.exec(tokenRef);
  return match ? match[1] : '';
};

type PrimaryToken =
  | 'Main'
  | 'MainHover'
  | 'MainActive'
  | 'MainLine'
  | 'OnMain'
  | 'Container'
  | 'ContainerHover'
  | 'ContainerActive'
  | 'ContainerLine'
  | 'OnContainer';

const PRIMARY_TOKENS: PrimaryToken[] = [
  'Main',
  'MainHover',
  'MainActive',
  'MainLine',
  'OnMain',
  'Container',
  'ContainerHover',
  'ContainerActive',
  'ContainerLine',
  'OnContainer',
];

const CONTAINER_ONLY_TOKENS: PrimaryToken[] = [
  'Container',
  'ContainerHover',
  'ContainerActive',
  'ContainerLine',
  'OnContainer',
];

const GROUP_TOKENS: Record<CustomThemeColorGroup, PrimaryToken[]> = {
  Background: CONTAINER_ONLY_TOKENS,
  Surface: CONTAINER_ONLY_TOKENS,
  SurfaceVariant: CONTAINER_ONLY_TOKENS,
  Primary: PRIMARY_TOKENS,
  Secondary: PRIMARY_TOKENS,
};

const deriveTokens = (baseHex: string, tokens: PrimaryToken[]): Record<PrimaryToken, string> => {
  const base = chroma(baseHex);
  const isLight = base.luminance() > 0.4;
  const mixTarget = isLight ? '#FFFFFF' : '#000000';
  const shift = (amt: number) => (isLight ? base.darken(amt) : base.brighten(amt)).hex();
  const mix = (t: number) => base.mix(mixTarget, t).hex();
  const on = isLight ? '#000000' : '#FFFFFF';

  return {
    Main: base.hex(),
    MainHover: shift(0.4),
    MainActive: shift(0.7),
    MainLine: shift(1.0),
    OnMain: on,
    Container: mix(0.82),
    ContainerHover: mix(0.76),
    ContainerActive: mix(0.7),
    ContainerLine: mix(0.62),
    OnContainer: on,
  };
};

const getCustomThemeVars = (
  customColors?: Partial<Record<CustomThemeColorGroup, string>>,
): Record<string, string> => {
  const vars: Record<string, string> = {};
  if (!customColors) return vars;

  (Object.keys(customColors) as CustomThemeColorGroup[]).forEach((group) => {
    const hex = customColors[group];
    if (!hex || !chroma.valid(hex)) return;
    const tokens = GROUP_TOKENS[group];
    const palette = deriveTokens(hex, tokens);
    tokens.forEach((token) => {
      const varName = getVarName((color as Record<string, Record<string, string>>)[group][token]);
      if (varName) vars[varName] = palette[token];
    });
  });
  return vars;
};

export const toHex = (input: string): string | null =>
  chroma.valid(input) ? chroma(input).hex() : null;

export const rgbParts = (hex: string): { r: number; g: number; b: number } | null => {
  if (!chroma.valid(hex)) return null;
  const [r, g, b] = chroma(hex).rgb();
  return { r, g, b };
};

export const hslParts = (hex: string): { h: number; s: number; l: number } | null => {
  if (!chroma.valid(hex)) return null;
  const [h, s, l] = chroma(hex).hsl();
  return { h, s, l };
};

export const applyThemeOverrides = (
  customColors?: Partial<Record<CustomThemeColorGroup, string>>,
): void => {
  let styleEl = document.getElementById(THEME_OVERRIDE_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = THEME_OVERRIDE_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  const vars = getCustomThemeVars(customColors);

  if (Object.keys(vars).length === 0) {
    styleEl.textContent = '';
    return;
  }

  const rules = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value} !important;`)
    .join('\n');
  styleEl.textContent = `body {\n${rules}\n}`;
};
