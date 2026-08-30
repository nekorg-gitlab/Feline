const BORDERS_STYLE_ID = 'feline-borders-override';

export const applyBorders = (hide: boolean): void => {
  let styleEl = document.getElementById(BORDERS_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = BORDERS_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  if (hide) {
    document.body.setAttribute('data-hide-borders', 'true');
    styleEl.textContent = `
body[data-hide-borders="true"] {
  --feline-divider-width: 0px !important;
}
body[data-hide-borders="true"] [data-feline-pane-divider] {
  display: none !important;
}
`;
  } else {
    document.body.removeAttribute('data-hide-borders');
    styleEl.textContent = `
body {
  --feline-divider-width: 1px;
}
`;
  }
};
