export function pushSessionToSW(baseUrl?: string, accessToken?: string) {
  if (!('serviceWorker' in navigator)) return;

  const send = (target: ServiceWorker | null) => {
    if (!target) return;
    try {
      target.postMessage({ type: 'setSession', accessToken, baseUrl });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[sw] postMessage failed', err);
    }
  };

  if (navigator.serviceWorker.controller) {
    send(navigator.serviceWorker.controller as unknown as ServiceWorker);
    return;
  }

  navigator.serviceWorker.ready
    .then((reg) => send(reg.active ?? reg.waiting ?? reg.installing ?? null))
    .catch((err) => {
      if (import.meta.env.DEV) console.warn('[sw] ready failed', err);
    });
}
