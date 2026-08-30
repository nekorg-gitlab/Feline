export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((window as any).__TAURI__ !== undefined ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ !== undefined);

export const openUrlInBrowser = async (url: string): Promise<boolean> => {
  if (!isTauri()) return false;
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return true;
  } catch {
    window.open(url, '_blank', 'noopener');
    return true;
  }
};
