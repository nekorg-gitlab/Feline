export const DEFAULT_ANIMATIONS_ENABLED = true;
export const DEFAULT_ANIMATION_SPEED = 1;
export const MIN_ANIMATION_SPEED = 0.5;
export const MAX_ANIMATION_SPEED = 2;

const ANIM_STYLE_ID = 'feline-animations-override';

export const clampSpeed = (v: number): number =>
  Math.max(
    MIN_ANIMATION_SPEED,
    Math.min(MAX_ANIMATION_SPEED, Number(v) || DEFAULT_ANIMATION_SPEED),
  );

export const getAnimationDuration = (enabled: boolean, speed: number): number => {
  if (!enabled) return 0;
  return Math.round(160 / clampSpeed(speed));
};

export const applyAnimations = (enabled: boolean, speed: number): void => {
  const s = clampSpeed(speed);
  const base = 160;
  const duration = enabled ? base / s : 0;
  const durationFast = enabled ? 120 / s : 0;
  const durationSlow = enabled ? 220 / s : 0;

  let styleEl = document.getElementById(ANIM_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = ANIM_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
:root {
  --feline-anim-duration: ${duration}ms;
  --feline-anim-duration-fast: ${durationFast}ms;
  --feline-anim-duration-slow: ${durationSlow}ms;
  --feline-anim-easing: cubic-bezier(0.22, 1, 0.36, 1);
  --feline-anim-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --feline-anim-easing-standard: cubic-bezier(0.2, 0, 0, 1);
}
${
  enabled
    ? ''
    : `
*,
*::before,
*::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
`
}
  `.trim();

  const root = document.documentElement;
  if (enabled) {
    root.removeAttribute('data-animations-disabled');
  } else {
    root.setAttribute('data-animations-disabled', 'true');
  }
};
