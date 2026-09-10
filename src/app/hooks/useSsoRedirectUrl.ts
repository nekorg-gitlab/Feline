import { isTauri } from '../utils/isTauri';
import { getLoginPath } from '../pages/pathUtils';
import { usePathWithOrigin } from './usePathWithOrigin';

export const TAURI_AUTH_SCHEME = 'feline';

/** Custom-scheme URL the IdP redirects back to inside the Tauri app. */
export const tauriAuthRedirectUrl = (server: string): string =>
  `${TAURI_AUTH_SCHEME}://auth/${encodeURIComponent(server)}`;

/**
 * Where the SSO IdP should send the user back with `?loginToken=`.
 * Browsers return to the login page; the Tauri app uses a custom scheme
 * that is captured natively (see TauriDeepLinkAuth).
 */
export const useSsoRedirectUrl = (server: string): string => {
  const originUrl = usePathWithOrigin(getLoginPath(server));
  if (isTauri()) return tauriAuthRedirectUrl(server);
  return originUrl;
};
