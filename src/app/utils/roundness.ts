import { config } from 'folds';

const ROUNDNESS_STYLE_ID = 'feline-roundness-override';

export const DEFAULT_ROUNDNESS = 50;
export const MAX_ROUNDNESS = 90;
export const MIN_ROUNDNESS = 0;

export const CHAT_RADIUS_VAR = '--feline-chat-radius';

const getVarName = (tokenRef: string): string => {
  const match = /var\((--[^)]+)\)/.exec(tokenRef);
  return match ? match[1] : '';
};

const remFor = (baseRem: number, value: number): string => {
  if (value <= 0) return '0';
  if (value >= MAX_ROUNDNESS) return '1.5rem';
  if (value <= 50) {
    const r = baseRem * (value / 50);
    return `${r}rem`;
  }
  const t = (value - 50) / (MAX_ROUNDNESS - 50);
  const maxRem = 1.5;
  const r = baseRem + (maxRem - baseRem) * t;
  return `${r}rem`;
};

const pillFor = (value: number): string => {
  if (value <= 0) return '0';
  if (value >= MAX_ROUNDNESS) return '9999px';
  return `${(9999 * value) / MAX_ROUNDNESS}px`;
};

const roundFor = (value: number): string => {
  if (value <= 0) return '0';
  if (value >= MAX_ROUNDNESS) return '50%';
  return `${(50 * value) / MAX_ROUNDNESS}%`;
};

export const toDisplayRoundness = (value: number): number =>
  Math.round((Math.max(0, Math.min(MAX_ROUNDNESS, value)) / MAX_ROUNDNESS) * 100);

export const fromDisplayRoundness = (display: number): number =>
  Math.round((Math.max(0, Math.min(100, display)) / 100) * MAX_ROUNDNESS);

export const applyRoundness = (value: number): void => {
  const v = Math.max(
    MIN_ROUNDNESS,
    Math.min(MAX_ROUNDNESS, Math.round(value ?? DEFAULT_ROUNDNESS)),
  );
  let styleEl = document.getElementById(ROUNDNESS_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = ROUNDNESS_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  // At default (50), we still set explicit values so slider reflects correctly,
  // but we could also clear. Keep explicit to ensure consistency across reloads where
  // config defaults match.
  const radii = config.radii as Record<string, string>;
  const varMap: Record<string, string> = {};

  const r0 = getVarName(radii.R0);
  const r300 = getVarName(radii.R300);
  const r400 = getVarName(radii.R400);
  const r500 = getVarName(radii.R500);
  const round = getVarName(radii.Round);
  const pill = getVarName(radii.Pill);

  if (r0) varMap[r0] = remFor(0, v);
  if (r300) varMap[r300] = remFor(0.25, v);
  if (r400) varMap[r400] = remFor(0.5, v);
  if (r500) varMap[r500] = remFor(0.75, v);
  if (round) varMap[round] = roundFor(v);
  if (pill) varMap[pill] = pillFor(v);
  varMap[CHAT_RADIUS_VAR] = remFor(0.5, v);

  const rules = Object.entries(varMap)
    .map(([name, val]) => `  ${name}: ${val} !important;`)
    .join('\n');
  styleEl.textContent = `body {\n${rules}\n}`;
};
