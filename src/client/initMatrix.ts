import { createClient, MatrixClient, IndexedDBStore, IndexedDBCryptoStore } from 'matrix-js-sdk';

import { createRoomNameGenerator } from '../app/utils/room';
import { cryptoCallbacks } from './secretStorageKeys';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import { pushSessionToSW } from '../sw-session';
import { getFilteredLogger } from './logger';
import {
  claimLegacyDbUser,
  clearAllSessions,
  getActiveSession,
  getLegacyDbUserId,
  getSessions,
  isLegacyDbUser,
  removeSession,
  setActiveSession,
} from '../app/state/sessions';

type Session = {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
};

export const LEGACY_SYNC_STORE = 'web-sync-store';
export const LEGACY_CRYPTO_STORE = 'crypto-store';
export const LEGACY_RUST_PREFIX = 'matrix-js-sdk';

export const getSyncStoreName = (userId: string) =>
  isLegacyDbUser(userId) ? LEGACY_SYNC_STORE : `feline-sync-${userId}`;
export const getCryptoStoreName = (userId: string) =>
  isLegacyDbUser(userId) ? LEGACY_CRYPTO_STORE : `feline-crypto-${userId}`;
export const getRustCryptoPrefix = (userId: string) =>
  isLegacyDbUser(userId) ? LEGACY_RUST_PREFIX : `feline-${userId}`;

export const initClient = async (session: Session): Promise<MatrixClient> => {
  if (!getLegacyDbUserId()) {
    const sessions = getSessions();
    if (sessions.length === 1 && sessions[0].userId === session.userId) {
      try {
        const dbs = await globalThis.indexedDB.databases();
        const names = new Set(dbs.map((d) => d.name));
        if (names.has(LEGACY_SYNC_STORE) && !names.has(`feline-sync-${session.userId}`)) {
          claimLegacyDbUser(session.userId);
        }
      } catch {}
    }
  }

  const indexedDBStore = new IndexedDBStore({
    indexedDB: globalThis.indexedDB,
    localStorage: globalThis.localStorage,
    dbName: getSyncStoreName(session.userId),
  });

  const legacyCryptoStore = new IndexedDBCryptoStore(
    globalThis.indexedDB,
    getCryptoStoreName(session.userId),
  );

  const mx = createClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    store: indexedDBStore,
    cryptoStore: legacyCryptoStore,
    deviceId: session.deviceId,
    timelineSupport: true,
    cryptoCallbacks: cryptoCallbacks as any,
    verificationMethods: ['m.sas.v1'],
    logger: getFilteredLogger() as never,
    roomNameGenerator: (roomId, state) => createRoomNameGenerator(mx)(roomId, state),
  });

  await indexedDBStore.startup();
  await mx.initRustCrypto({ cryptoDatabasePrefix: getRustCryptoPrefix(session.userId) });

  mx.setMaxListeners(50);

  return mx;
};

export const startClient = async (mx: MatrixClient) => {
  await mx.startClient({
    lazyLoadMembers: true,
  });
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

const deleteIndexedDBsForUser = async (userId: string) => {
  try {
    const dbs = await window.indexedDB.databases();
    const targets = new Set([
      getSyncStoreName(userId),
      getCryptoStoreName(userId),
      `${getRustCryptoPrefix(userId)}::matrix-sdk-crypto`,
      `${getRustCryptoPrefix(userId)}::matrix-sdk-crypto-meta`,
    ]);
    await Promise.all(
      dbs
        .map((info) => info.name)
        .filter((name): name is string => !!name && targets.has(name))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
    );
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[matrix] failed to delete user dbs', err);
  }
};

export const removePerUserLocalData = (userId: string) => {
  clearNavToActivePathStore(userId);
  try {
    localStorage.removeItem(`feline:verification:choice:${userId}`);
    localStorage.removeItem(`feline:recoveryKey:${userId}`);
  } catch {}
};

export const cleanupLoggedOutSession = async (userId: string, mx?: MatrixClient) => {
  if (mx) {
    mx.stopClient();
    try {
      await mx.clearStores({ cryptoDatabasePrefix: getRustCryptoPrefix(userId) });
    } catch {}
  }
  removePerUserLocalData(userId);
  await deleteIndexedDBsForUser(userId);
  const remaining = removeSession(userId);
  if (remaining.length > 0) {
    setActiveSession(remaining[0].userId);
  }
  pushSessionToSW();
};

export const logoutSpecificSession = async (userId: string, mx?: MatrixClient) => {
  const sessions = getSessions();
  const target = sessions.find((s) => s.userId === userId);
  const active = getActiveSession();
  const isActive = active?.userId === userId;

  if (isActive && mx) {
    pushSessionToSW();
    mx.stopClient();
    try {
      await mx.logout();
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[matrix] logout failed', err);
    }
    try {
      await mx.clearStores({ cryptoDatabasePrefix: getRustCryptoPrefix(userId) });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[matrix] clearStores failed', err);
    }
    removePerUserLocalData(userId);
    await deleteIndexedDBsForUser(userId);
    const remaining = removeSession(userId);
    if (remaining.length > 0) {
      setActiveSession(remaining[0].userId);
    }
    window.location.reload();
    return;
  }

  if (target) {
    try {
      const temp = createClient({
        baseUrl: target.baseUrl,
        accessToken: target.accessToken,
        userId: target.userId,
      });
      await temp.logout();
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[matrix] remote logout failed', err);
    }
  }
  removePerUserLocalData(userId);
  await deleteIndexedDBsForUser(userId);
  const remaining = removeSession(userId);
  if (isActive) {
    if (remaining.length > 0) setActiveSession(remaining[0].userId);
    pushSessionToSW();
    window.location.reload();
  }
};

export const logoutClient = async (mx: MatrixClient) => {
  await logoutSpecificSession(mx.getSafeUserId(), mx);
};

export const switchActiveSession = (userId: string) => {
  const active = getActiveSession();
  if (!active || active.userId === userId) return;
  setActiveSession(userId);
  window.location.reload();
};

export const clearLoginData = async () => {
  const sessions = getSessions();
  try {
    const dbs = await window.indexedDB.databases();
    const felineDb = (name: string) =>
      name.startsWith('feline-') ||
      name.startsWith('web-sync-store') ||
      name.startsWith('crypto-store') ||
      name.startsWith('matrix-js-sdk');
    await Promise.all(
      dbs
        .map((info) => info.name)
        .filter((name): name is string => !!name && felineDb(name))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
    );
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[matrix] clearLoginData dbs failed', err);
  }

  sessions.forEach((s) => removePerUserLocalData(s.userId));
  clearAllSessions();
  pushSessionToSW();
  window.location.reload();
};
