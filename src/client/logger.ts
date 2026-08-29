import { logger } from 'matrix-js-sdk/lib/logger';
import loglevel from 'loglevel';

const NOISY_PATTERNS = [
  'Adding default global',
  'Ignoring expired device membership',
  'GroupCallEventHandler',
  'Resuming queue after resumed sync',
  'Rotating session for room',
  'use slotId compat hack',
  'Activated a backup',
  'matrix_sdk_crypto::machine: Failed to decrypt',
  'Failed to decrypt a room event',
  'Error decrypting event',
  'No luck requesting key backup',
  'No room_keys found',
  'M_NOT_FOUND',
  'MatrixError: [404]',
  'MatrixError: [400]',
  'IndexedDB',
  'indexeddb',
  'exists',
  'containsData',
  'get_all_rooms',
  'get_all_rooms_pending_key_bundles',
  'matrix_sdk_indexeddb::crypto_store',
  'matrix_sdk_crypto::backups',
  'matrix_sdk_crypto',
  'matrix_sdk',
  'tracing_subscriber',
  'DecryptionError',
  'PerSessionKeyBackupDownloader',
  'containsData',
  'exists @',
  'get_withheld_info',
  'get_inbound_group_session',
  'load_backup_keys',
  'get_user_identity',
  'matrix_sdk_crypto_wasm',
  'wasm_bg',
  '[Intervention] Images loaded lazily',
  'Images loaded lazily and replaced with placeholders',
  'GET https://nekorg.gitlab.io/feline/',
  'attribution-reporting',
  'Unrecognized feature',
  'Permissions-Policy',
  'MaxListenersExceededWarning',
  'Possible EventEmitter memory leak',
  'ObjectMultiplex - orphaned data',
  'orphaned data for stream',
  'background-liveness',
  'app-init-liveness',
  'contentscript.js',
  'Failed to load resource',
  'the server responded with a status',
  'Maximum update depth exceeded',
  'has been externalized for browser compatibility',
  'Cannot access',
  'browser-external',
  'React Router Future Flag Warning',
  'v7_startTransition',
  '404 (Not Found)',
  '400 (Bad Request)',
  'room_keys/keys',
  '/_matrix/client/v3/room_keys',
  '/_matrix/client/v1/media/thumbnail',
  'GET https://matrix-client.matrix.org',
];

const shouldSuppress = (args: unknown[]): boolean => {
  try {
    const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ').toLowerCase();
    return NOISY_PATTERNS.some((p) => text.includes(p.toLowerCase()));
  } catch {
    return false;
  }
};

const createFilteredMethod = (
  original: (...args: unknown[]) => void,
  _level: 'debug' | 'info' | 'warn' | 'error' | 'log' | 'trace'
) =>
  (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    if (args.length === 1 && typeof args[0] === 'string' && args[0].trim() === 'IndexedDB') return;
    return (original as (...a: unknown[]) => void)(...args);
  };

export const setupLogger = (): void => {
  if (typeof window === 'undefined') return;

  const level = loglevel.levels.WARN;

  try {
    (logger as unknown as { setLevel: (l: number, persist: boolean) => void }).setLevel(level, false);
  } catch {}

  try {
    const matrixLogger = loglevel.getLogger('matrix');
    matrixLogger.setLevel(level, false);
  } catch {}

  try {
    loglevel.getLogger('matrix').setLevel(level, false);
    loglevel.getLogger('matrix-msc3914').setLevel(level, false);
    loglevel.getLogger('matrix-rtc').setLevel(level, false);
  } catch {}

  const methods: Array<keyof Console> = ['debug', 'info', 'warn', 'error', 'log', 'trace'];
  methods.forEach((method) => {
    const orig = console[method] as (...args: unknown[]) => void;
    if (typeof orig !== 'function') return;
    const filtered = createFilteredMethod(orig.bind(console), method as never);
    (console as unknown as Record<string, unknown>)[method] = filtered;
  });

  const originalConsoleError = console.error.bind(console);
  const originalConsoleWarn = console.warn.bind(console);

  window.addEventListener('error', (event) => {
    if (shouldSuppress([event.message, event.filename])) {
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const text = typeof reason === 'string' ? reason : reason?.message ?? String(reason);
    if (shouldSuppress([text])) {
      event.preventDefault();
    }
  });

  void originalConsoleError;
  void originalConsoleWarn;
};

export const getFilteredLogger = () => {
  const base = logger;
  const filtered: typeof logger = {
    trace: (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      (base.trace as (...a: unknown[]) => void)(...args);
    },
    debug: (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      (base.debug as (...a: unknown[]) => void)(...args);
    },
    info: (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      (base.info as (...a: unknown[]) => void)(...args);
    },
    warn: (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      (base.warn as (...a: unknown[]) => void)(...args);
    },
    error: (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      (base.error as (...a: unknown[]) => void)(...args);
    },
    getChild: base.getChild.bind(base),
  } as unknown as typeof logger;
  return filtered;
};
