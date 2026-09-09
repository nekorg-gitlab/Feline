/// <reference lib="WebWorker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

export type {};
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<unknown> };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

(() => {
  const swNoisy = ['Failed to load resource', 'matrix_sdk', 'thumbnail'];
  const shouldSuppress = (args: unknown[]) => {
    try {
      const t = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
      return swNoisy.some((p) => t.includes(p));
    } catch (err) {
      void err;
      return false;
    }
  };
  (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).forEach((k) => {
    const orig = (console as unknown as Record<string, (...a: unknown[]) => void>)[k];
    if (typeof orig !== 'function') return;
    (console as unknown as Record<string, unknown>)[k] = (...a: unknown[]) => {
      if (shouldSuppress(a)) return;
      return orig.apply(console, a);
    };
  });
})();

type SessionInfo = {
  accessToken: string;
  baseUrl: string;
};

const sessions = new Map<string, SessionInfo>();

const clientToResolve = new Map<string, (value: SessionInfo | undefined) => void>();
const clientToSessionPromise = new Map<string, Promise<SessionInfo | undefined>>();

async function cleanupDeadClients() {
  const activeClients = await self.clients.matchAll();
  const activeIds = new Set(activeClients.map((c) => c.id));

  Array.from(sessions.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      sessions.delete(id);
      clientToResolve.delete(id);
      clientToSessionPromise.delete(id);
    }
  });
}

function setSession(clientId: string, accessToken: any, baseUrl: any) {
  if (typeof accessToken === 'string' && typeof baseUrl === 'string') {
    sessions.set(clientId, { accessToken, baseUrl });
  } else {
    sessions.delete(clientId);
  }

  const resolveSession = clientToResolve.get(clientId);
  if (resolveSession) {
    resolveSession(sessions.get(clientId));
    clientToResolve.delete(clientId);
    clientToSessionPromise.delete(clientId);
  }
}

function requestSession(client: Client): Promise<SessionInfo | undefined> {
  const promise =
    clientToSessionPromise.get(client.id) ??
    new Promise((resolve) => {
      clientToResolve.set(client.id, resolve);
      client.postMessage({ type: 'requestSession' });
    });

  if (!clientToSessionPromise.has(client.id)) {
    clientToSessionPromise.set(client.id, promise);
  }

  return promise;
}

async function requestSessionWithTimeout(
  clientId: string,
  timeoutMs = 3000,
): Promise<SessionInfo | undefined> {
  const client = await self.clients.get(clientId);
  if (!client) return undefined;

  const sessionPromise = requestSession(client);

  const timeout = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), timeoutMs);
  });

  return Promise.race([sessionPromise, timeout]);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await cleanupDeadClients();
    })(),
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as Client | null;
  if (!client) return;

  const { type, accessToken, baseUrl } = event.data || {};

  if (type === 'setSession') {
    setSession(client.id, accessToken, baseUrl);
    cleanupDeadClients();
  }
});

const MEDIA_PATHS = [
  '/_matrix/client/v1/media/download',
  '/_matrix/client/v1/media/thumbnail',
  '/_matrix/media/v3/download',
  '/_matrix/media/v3/thumbnail',
];

function mediaPath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return MEDIA_PATHS.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}

function isAuthenticatedMediaPath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith('/_matrix/client/v1/media/');
  } catch {
    return false;
  }
}

function validMediaRequest(url: string, baseUrl: string): boolean {
  return MEDIA_PATHS.some((p) => {
    const validUrl = new URL(p, baseUrl);
    return url.startsWith(validUrl.href);
  });
}

function fetchConfig(token: string): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  };
}

const badGateway = () => new Response(null, { status: 502, statusText: 'Bad Gateway' });
async function fetchWithAuth(url: string, token: string): Promise<Response> {
  try {
    return await fetch(url, fetchConfig(token));
  } catch {
    return badGateway();
  }
}
async function fetchWithFallback(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    return badGateway();
  }
}

self.addEventListener('fetch', (event: FetchEvent) => {
  const req = event.request;
  if (req.mode === 'navigate' && req.method === 'GET') {
    if (mediaPath(req.url)) return;
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        const networkPromise = fetch(req)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches
                .open('navigations')
                .then((cache) => cache.put(req, copy))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => undefined);

        if (cached) {
          void networkPromise;
          return cached;
        }

        const networkResponse = await networkPromise;
        if (networkResponse) return networkResponse;

        const offlineCandidates = [
          '/offline.html',
          '/feline/offline.html',
          new URL('offline.html', self.location.href).href,
          'offline.html',
        ];
        for (const url of offlineCandidates) {
          const offline = await caches.match(url);
          if (offline) return offline;
        }
        return new Response('Offline - Feline needs internet for first launch', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })(),
    );
    return;
  }
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const { url, method } = event.request;

  if (method !== 'GET' || !mediaPath(url)) return;

  const { clientId } = event;
  if (!clientId) return;

  const isAuth = isAuthenticatedMediaPath(url);
  const session = sessions.get(clientId);
  if (session) {
    if (validMediaRequest(url, session.baseUrl)) {
      if (isAuth) {
        event.respondWith(fetchWithAuth(url, session.accessToken));
      } else {
        event.respondWith(fetchWithFallback(event.request));
      }
    } else if (isAuth) {
      event.respondWith(new Response(null, { status: 401, statusText: 'Unauthorized' }));
    }
    return;
  }

  event.respondWith(
    requestSessionWithTimeout(clientId).then((s) => {
      if (s && validMediaRequest(url, s.baseUrl)) {
        if (isAuth) return fetchWithAuth(url, s.accessToken);
        return fetchWithFallback(event.request);
      }
      if (isAuth) {
        return new Response(null, { status: 401, statusText: 'Unauthorized' });
      }
      return fetchWithFallback(event.request);
    }),
  );
});
