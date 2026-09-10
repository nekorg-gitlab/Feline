import { createContext, useCallback, useContext, useState } from 'react';
import { useElementSizeObserver } from './useElementSizeObserver';
import { COMPACT_HEIGHT_BREAKPOINT } from '../styles/media';

export const TABLET_BREAKPOINT = 1124;
export const MOBILE_BREAKPOINT = 750;
// Viewports shorter than this (e.g. phones held in landscape) use the Mobile
// single-pane layout even when wide enough for the multi-pane layouts,
// which need vertical room for headers, lists and the composer.
// (The matching CSS query lives in styles/media.)
export enum ScreenSize {
  Desktop = 'Desktop',
  Tablet = 'Tablet',
  Mobile = 'Mobile',
}

export const getScreenSize = (width: number, height: number): ScreenSize => {
  if (height < COMPACT_HEIGHT_BREAKPOINT) return ScreenSize.Mobile;
  if (width > TABLET_BREAKPOINT) return ScreenSize.Desktop;
  if (width > MOBILE_BREAKPOINT) return ScreenSize.Tablet;
  return ScreenSize.Mobile;
};

export const useScreenSize = (): ScreenSize => {
  const [size, setSize] = useState<ScreenSize>(() =>
    getScreenSize(document.body.clientWidth, document.body.clientHeight),
  );

  useElementSizeObserver(
    useCallback(() => document.body, []),
    useCallback((width, height) => setSize(getScreenSize(width, height)), []),
  );

  return size;
};

const ScreenSizeContext = createContext<ScreenSize | null>(null);
export const ScreenSizeProvider = ScreenSizeContext.Provider;

export const useScreenSizeContext = (): ScreenSize => {
  const screenSize = useContext(ScreenSizeContext);
  if (screenSize === null) {
    throw new Error('Screen size not provided!');
  }
  return screenSize;
};
