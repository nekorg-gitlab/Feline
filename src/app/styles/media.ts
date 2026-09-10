// Media query matching the JS `ScreenSize.Mobile` breakpoint: narrow viewports
// OR short ones (phones held in landscape). Keep in sync with getScreenSize()
// in hooks/useScreenSize — CSS cannot read the JS value, so both live here.
export const COMPACT_HEIGHT_BREAKPOINT = 500;

export const mobileScreenMedia = `screen and (max-width: 750px), screen and (max-height: ${COMPACT_HEIGHT_BREAKPOINT - 1}px)`;

// Compact height only (phones held in landscape), regardless of width.
// The Android WebView keeps reporting the portrait display-cutout inset for
// `safe-area-inset-top` after rotation, so landscape-specific caps live here.
export const compactHeightMedia = `screen and (max-height: ${COMPACT_HEIGHT_BREAKPOINT - 1}px)`;
