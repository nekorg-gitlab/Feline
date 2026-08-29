import chroma from 'chroma-js';
import { color } from 'folds';

const ACCENT_STYLE_ID = 'feline-accent-override';

export const applyAccentColor = (accent?: string): void => {
  let styleEl = document.getElementById(ACCENT_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = ACCENT_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  if (!accent) {
    styleEl.textContent = '';
    return;
  }

  const vars = getAccentColorVars(accent);
  const rules = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value} !important;`)
    .join('\n');
  styleEl.textContent = `body {\n${rules}\n}`;
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

const getVarName = (tokenRef: string): string => {
  const match = /var\((--[^)]+)\)/.exec(tokenRef);
  return match ? match[1] : '';
};

export const getAccentColorVars = (hex: string): Record<string, string> => {
  if (!chroma.valid(hex)) return {};

  const base = chroma(hex);
  const isLight = base.luminance() > 0.4;
  const mixTarget = isLight ? '#FFFFFF' : '#000000';

  const palette: Record<PrimaryToken, string> = {
    Main: base.hex(),
    MainHover: base.darken(0.4).hex(),
    MainActive: base.darken(0.7).hex(),
    MainLine: base.darken(1.0).hex(),
    OnMain: isLight ? '#000000' : '#FFFFFF',
    Container: base.mix(mixTarget, 0.82).hex(),
    ContainerHover: base.mix(mixTarget, 0.76).hex(),
    ContainerActive: base.mix(mixTarget, 0.7).hex(),
    ContainerLine: base.mix(mixTarget, 0.62).hex(),
    OnContainer: isLight ? '#000000' : '#FFFFFF',
  };

  const vars: Record<string, string> = {};
  PRIMARY_TOKENS.forEach((token) => {
    const varName = getVarName(color.Primary[token] as unknown as string);
    if (varName) vars[varName] = palette[token];
  });
  return vars;
};
