import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTauri } from '../../utils/isTauri';
import { clientDefaultServer, useClientConfig } from '../../hooks/useClientConfig';
import { getLoginPath, withSearchParam } from '../pathUtils';
import { TAURI_AUTH_SCHEME } from '../../hooks/useSsoRedirectUrl';

/**
 * Completes SSO inside the Tauri app without any token copy-paste.
 * The IdP redirects to `feline://auth/<server>?loginToken=…`, the OS hands
 * it back to the app, and we route into the normal token-login flow.
 */
export function TauriDeepLinkAuth() {
  const navigate = useNavigate();
  const clientConfig = useClientConfig();

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const handleUrls = (urls: string[]) => {
      urls.forEach((raw) => {
        let url: URL;
        try {
          url = new URL(raw);
        } catch {
          return;
        }
        if (url.protocol !== `${TAURI_AUTH_SCHEME}:`) return;
        const token = url.searchParams.get('loginToken');
        if (!token) return;
        // eslint-disable-next-line no-console
        console.info(`[sso] deep link return for ${url.host}${url.pathname}`);
        const server =
          decodeURIComponent(url.pathname.replace(/^\//, '')) || clientDefaultServer(clientConfig);
        navigate(withSearchParam(getLoginPath(server), { loginToken: token }), {
          replace: true,
        });
      });
    };

    import('@tauri-apps/plugin-deep-link')
      .then(({ onOpenUrl, getCurrent }) => {
        if (cancelled) return;
        getCurrent()
          .then((urls) => {
            if (urls) handleUrls(urls);
          })
          .catch(() => {});
        onOpenUrl(handleUrls)
          .then((stop) => {
            unlisten = stop;
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [navigate, clientConfig]);

  return null;
}
