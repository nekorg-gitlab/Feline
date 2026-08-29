import { logger } from 'matrix-js-sdk/lib/logger';
import loglevel from 'loglevel';

const NOISY_PATTERNS = [
  'Adding default global',
  'Ignoring expired device membership',
  'GroupCallEventHandler',
  'Resuming queue after resumed sync',
  'Rotating session for room',
  'Activated a backup',
  'Failed to decrypt a room event',
  'Error decrypting event',
  'matrix_sdk_crypto',
  'matrix_sdk',
  'DecryptionError',
  'PerSessionKeyBackupDownloader',
  'Images loaded lazily',
  'MaxListenersExceededWarning',
  'Possible EventEmitter memory leak',
  'ObjectMultiplex - orphaned data',
  'background-liveness',
  'contentscript.js',
  'React Router Future Flag Warning',
  'v7_startTransition',
  'has been externalized for browser compatibility',
];

const shouldSuppress = (args: unknown[]): boolean => {
  try {
    const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ').toLowerCase();
    return NOISY_PATTERNS.some((p) => text.includes(p.toLowerCase()));
  } catch (err) {
    if (import.meta.env.DEV) console.debug('[logger] suppress check failed', err);
    return false;
  }
};

const createFilteredMethod =
  (original: (...args: unknown[]) => void) =>
  (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    return (original as (...a: unknown[]) => void)(...args);
  };

export const setupLogger = (): void => {
  if (typeof window === 'undefined') return;

  const level = loglevel.levels.WARN;

  try {
    (logger as unknown as { setLevel: (l: number, persist: boolean) => void }).setLevel(level, false);
  } catch (err) {
    if (import.meta.env.DEV) console.debug('[logger] setLevel failed', err);
  }

  try {
    loglevel.getLogger('matrix').setLevel(level, false);
    loglevel.getLogger('matrix-msc3914').setLevel(level, false);
    loglevel.getLogger('matrix-rtc').setLevel(level, false);
  } catch (err) {
    if (import.meta.env.DEV) console.debug('[logger] loglevel failed', err);
  }

  (['debug', 'info', 'warn', 'error', 'log', 'trace'] as const).forEach((method) => {
    const orig = console[method] as (...args: unknown[]) => void;
    if (typeof orig !== 'function') return;
    (console as unknown as Record<string, unknown>)[method] = createFilteredMethod(orig.bind(console));
  });

  window.addEventListener('error', (event) => {
    if (shouldSuppress([event.message, event.filename])) event.preventDefault();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const text = typeof reason === 'string' ? reason : reason?.message ?? String(reason);
    if (shouldSuppress([text])) event.preventDefault();
  });
};

export const getFilteredLogger = () => {
  const base = logger as unknown as Record<string, (...a: unknown[]) => void>;
  const filtered = {} as typeof logger;
  (['trace', 'debug', 'info', 'warn', 'error'] as const).forEach((k) => {
    (filtered as unknown as Record<string, unknown>)[k] = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      (base[k] as (...a: unknown[]) => void)(...args);
    };
  });
  (filtered as unknown as Record<string, unknown>).getChild = base.getChild.bind(base);
  return filtered;
};
