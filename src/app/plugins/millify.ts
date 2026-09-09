import * as millifyModuleNS from 'millify';
import { MillifyOptions } from 'millify/dist/options';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMillifyFn = (mod: unknown): any => {
  const m: any = mod;
  if (typeof m === 'function') return m;
  if (m && typeof m.default === 'function') return m.default;
  const def: any = m?.default;
  if (def && typeof def.default === 'function') return def.default;
  if (m && typeof m.millify === 'function') return m.millify;
  if (def && typeof def.millify === 'function') return def.millify;
  return null;
};

const millifyPlugin: any = getMillifyFn(millifyModuleNS);

export const millify = (count: number, options?: any): string => {
  if (!millifyPlugin) {
    return `${count}`;
  }
  return millifyPlugin(count, {
    precision: 1,
    locales: [],
    ...options,
  });
};
