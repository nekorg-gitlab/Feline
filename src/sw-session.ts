export function pushSessionToSW(baseUrl?: string, accessToken?: string) {
  if (!('serviceWorker' in navigator)) return;

  const send = (target: ServiceWorker | null) => {
    if (!target) return;
    try {
      target.postMessage({
        type: 'setSession',
        accessToken,
        baseUrl,
      });
    } catch {}
  };

  // Prefer controller, but fallback to ready/active for first load when controller is not yet set
  if (navigator.serviceWorker.controller) {
    send(navigator.serviceWorker.controller as unknown as ServiceWorker);
    return;
  }

  // Fallback: try ready/active (handles first load before SW claims)
  navigator.serviceWorker.ready
    .then((reg) => {
      const sw = reg.active ?? reg.waiting ?? reg.installing ?? null;
      send(sw);
    })
    .catch(() => {});
}
