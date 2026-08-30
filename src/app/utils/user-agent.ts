import { UAParser } from 'ua-parser-js';

export const ua = () => {
  const result = UAParser(window.navigator.userAgent) as unknown as {
    os: { name?: string };
    device: { type?: string };
    browser: unknown;
    cpu: unknown;
    engine: unknown;
    ua: string;
  };
  if (result && typeof (result as { getResult?: unknown }).getResult === 'function') {
    return (result as unknown as { getResult: () => typeof result }).getResult();
  }
  return result;
};

export const isMacOS = () => {
  const name = ua().os.name;
  return name === 'Mac OS' || name === 'macOS';
};

export const mobileOrTablet = (): boolean => {
  const userAgent = ua();
  const { os, device } = userAgent;
  if (device.type === 'mobile' || device.type === 'tablet') return true;
  if (os.name === 'Android' || os.name === 'iOS') return true;
  return false;
};
