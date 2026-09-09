export type Session = {
  baseUrl: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  expiresInMs?: number;
  refreshToken?: string;
  fallbackSdkStores?: boolean;
  displayName?: string;
  avatarUrl?: string;
};

export type Sessions = Session[];
export type SessionStoreName = {
  sync: string;
  crypto: string;
};

const SESSIONS_KEY = 'feline_sessions';
const ACTIVE_SESSION_KEY = 'feline_active_session';
const ADDING_ACCOUNT_KEY = 'feline_adding_account';
const LEGACY_DB_USER_KEY = 'feline_legacy_db_user';

const LEGACY_BASE_URL = 'feline_hs_base_url';
const LEGACY_USER_ID = 'feline_user_id';
const LEGACY_DEVICE_ID = 'feline_device_id';
const LEGACY_ACCESS_TOKEN = 'feline_access_token';

const isValidSession = (s: unknown): s is Session => {
  if (!s || typeof s !== 'object') return false;
  const v = s as Record<string, unknown>;
  return (
    typeof v.baseUrl === 'string' &&
    !!v.baseUrl &&
    typeof v.userId === 'string' &&
    !!v.userId &&
    typeof v.deviceId === 'string' &&
    !!v.deviceId &&
    typeof v.accessToken === 'string' &&
    !!v.accessToken
  );
};

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readSessionsList = (): Session[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  const parsed = safeParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidSession);
};

const writeSessionsList = (sessions: Session[]) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

const syncLegacyKeys = (session?: Session) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  if (!session) {
    localStorage.removeItem(LEGACY_BASE_URL);
    localStorage.removeItem(LEGACY_USER_ID);
    localStorage.removeItem(LEGACY_DEVICE_ID);
    localStorage.removeItem(LEGACY_ACCESS_TOKEN);
    return;
  }
  localStorage.setItem(LEGACY_BASE_URL, session.baseUrl);
  localStorage.setItem(LEGACY_USER_ID, session.userId);
  localStorage.setItem(LEGACY_DEVICE_ID, session.deviceId);
  localStorage.setItem(LEGACY_ACCESS_TOKEN, session.accessToken);
};

const readLegacySession = (): Session | undefined => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return undefined;
  const baseUrl = localStorage.getItem(LEGACY_BASE_URL);
  const userId = localStorage.getItem(LEGACY_USER_ID);
  const deviceId = localStorage.getItem(LEGACY_DEVICE_ID);
  const accessToken = localStorage.getItem(LEGACY_ACCESS_TOKEN);
  if (baseUrl && userId && deviceId && accessToken) {
    return { baseUrl, userId, deviceId, accessToken, fallbackSdkStores: true };
  }
  return undefined;
};

const migrateLegacyIfNeeded = (): Session[] => {
  const existing = readSessionsList();
  if (existing.length > 0) return existing;
  const legacy = readLegacySession();
  if (!legacy) return [];
  writeSessionsList([legacy]);
  localStorage.setItem(ACTIVE_SESSION_KEY, legacy.userId);
  localStorage.setItem(LEGACY_DB_USER_KEY, legacy.userId);
  return [legacy];
};

export const getLegacyDbUserId = (): string | undefined => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return undefined;
  return localStorage.getItem(LEGACY_DB_USER_KEY) ?? undefined;
};

export const claimLegacyDbUser = (userId: string): void => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  if (localStorage.getItem(LEGACY_DB_USER_KEY)) return;
  localStorage.setItem(LEGACY_DB_USER_KEY, userId);
};

export const isLegacyDbUser = (userId: string): boolean => getLegacyDbUserId() === userId;

export const getSessions = (): Session[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  return migrateLegacyIfNeeded();
};

export const getActiveSessionId = (): string | undefined => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return undefined;
  const sessions = migrateLegacyIfNeeded();
  if (sessions.length === 0) return undefined;
  const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (activeId && sessions.some((s) => s.userId === activeId)) return activeId;
  return sessions[0].userId;
};

export const getActiveSession = (): Session | undefined => {
  const sessions = getSessions();
  if (sessions.length === 0) return undefined;
  const activeId = getActiveSessionId();
  return sessions.find((s) => s.userId === activeId) ?? sessions[0];
};

export const getFallbackSession = (): Session | undefined => getActiveSession();

export function setFallbackSession(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string,
  extra?: Pick<Session, 'displayName' | 'avatarUrl' | 'expiresInMs' | 'refreshToken'>,
) {
  const sessions = getSessions();
  const existing = sessions.find((s) => s.userId === userId);
  addSession({
    baseUrl,
    userId,
    deviceId,
    accessToken,
    fallbackSdkStores: true,
    ...extra,
    displayName: extra?.displayName ?? existing?.displayName,
    avatarUrl: extra?.avatarUrl ?? existing?.avatarUrl,
  });
}

export const addSession = (session: Session) => {
  const sessions = getSessions();
  const others = sessions.filter((s) => s.userId !== session.userId);
  const merged = [...others, { ...session, fallbackSdkStores: true }];
  writeSessionsList(merged);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ACTIVE_SESSION_KEY, session.userId);
    localStorage.removeItem(ADDING_ACCOUNT_KEY);
  }
  syncLegacyKeys(merged.find((s) => s.userId === session.userId));
};

export const setActiveSession = (userId: string) => {
  if (typeof localStorage === 'undefined') return;
  const sessions = getSessions();
  const target = sessions.find((s) => s.userId === userId);
  if (!target) return;
  localStorage.setItem(ACTIVE_SESSION_KEY, userId);
  syncLegacyKeys(target);
};

export const removeSession = (userId: string): Session[] => {
  const sessions = getSessions();
  const remaining = sessions.filter((s) => s.userId !== userId);
  writeSessionsList(remaining);
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem(LEGACY_DB_USER_KEY) === userId) {
      localStorage.removeItem(LEGACY_DB_USER_KEY);
    }
    const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (activeId === userId) {
      if (remaining.length > 0) {
        localStorage.setItem(ACTIVE_SESSION_KEY, remaining[0].userId);
        syncLegacyKeys(remaining[0]);
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        syncLegacyKeys(undefined);
      }
    }
  }
  return remaining;
};

export const updateSessionProfile = (
  userId: string,
  profile: Pick<Session, 'displayName' | 'avatarUrl'>,
) => {
  const sessions = getSessions();
  let changed = false;
  const merged = sessions.map((s) => {
    if (s.userId !== userId) return s;
    const next = { ...s };
    if (profile.displayName !== undefined && profile.displayName !== s.displayName) {
      next.displayName = profile.displayName;
      changed = true;
    }
    if (profile.avatarUrl !== undefined && profile.avatarUrl !== s.avatarUrl) {
      next.avatarUrl = profile.avatarUrl;
      changed = true;
    }
    return next;
  });
  if (changed) writeSessionsList(merged);
};

export const clearAllSessions = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  localStorage.removeItem(ADDING_ACCOUNT_KEY);
  localStorage.removeItem(LEGACY_DB_USER_KEY);
  syncLegacyKeys(undefined);
};

export const removeFallbackSession = () => {
  const activeId = getActiveSessionId();
  if (activeId) removeSession(activeId);
  else {
    syncLegacyKeys(undefined);
  }
};

export const isAddingAccount = (): boolean => {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(ADDING_ACCOUNT_KEY) === '1';
};

export const setAddingAccount = (adding: boolean) => {
  if (typeof localStorage === 'undefined') return;
  if (adding) localStorage.setItem(ADDING_ACCOUNT_KEY, '1');
  else localStorage.removeItem(ADDING_ACCOUNT_KEY);
};
