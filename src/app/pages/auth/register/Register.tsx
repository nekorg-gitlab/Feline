import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Text, color } from 'folds';
import { SSOAction, createClient } from 'matrix-js-sdk';
import { useSearchParams } from 'react-router-dom';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useAuthFlows } from '../../../hooks/useAuthFlows';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { useSsoRedirectUrl } from '../../../hooks/useSsoRedirectUrl';
import { isTauri } from '../../../utils/isTauri';
import { TokenLogin } from '../login/TokenLogin';

export function Register() {
  const { t } = useTranslation();
  const server = useAuthServer();
  const { loginFlows } = useAuthFlows();
  const { sso } = useParsedLoginFlows(loginFlows.flows);
  const ssoRedirectUrl = useSsoRedirectUrl(server);
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

  const singleProviderId = useMemo(() => {
    const providers = sso?.identity_providers;
    if (providers && providers.length === 1) return providers[0].id;
    return undefined;
  }, [sso]);

  const getSsoUrl = useCallback(
    (action: SSOAction) => mx.getSsoLoginUrl(ssoRedirectUrl, 'sso', singleProviderId, action),
    [mx, ssoRedirectUrl, singleProviderId],
  );

  const handleSsoClick = useCallback(async (evt: React.MouseEvent, url: string) => {
    if (!isTauri()) return;
    evt.preventDefault();
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  }, []);

  const [searchParams] = useSearchParams();
  const loginToken = searchParams.get('loginToken') ?? undefined;

  // SSO may return to the register page (or the deep link may land here);
  // complete the token login instead of stranding the user.
  if (loginToken) {
    return (
      <Box direction="Column" gap="500">
        <TokenLogin token={loginToken} />
      </Box>
    );
  }

  const hasSso = !!sso;

  return (
    <Box direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="H2" priority="400">
          {t('Common.createAccount')}
        </Text>
        <Text size="T300" priority="300">
          {t('UI.createANewAccountToGetStarted')}
        </Text>
      </Box>

      {hasSso ? (
        <Box direction="Column" gap="300">
          <Button
            as="a"
            href={getSsoUrl(SSOAction.REGISTER)}
            onClick={(evt) => handleSsoClick(evt, getSsoUrl(SSOAction.REGISTER))}
            size="500"
            variant="Primary"
            fill="Solid"
          >
            <Text as="span" size="B500">
              {t('Common.register')}
            </Text>
          </Button>
          <Button
            as="a"
            href={getSsoUrl(SSOAction.LOGIN)}
            onClick={(evt) => handleSsoClick(evt, getSsoUrl(SSOAction.LOGIN))}
            size="500"
            variant="Secondary"
            fill="Soft"
            outlined
          >
            <Text as="span" size="B500">
              {t('Common.login')}
            </Text>
          </Button>
          {isTauri() && (
            <Text size="T200" priority="300" align="Center">
              {t('UI.thisWillOpenYourBrowserToContinue')}
            </Text>
          )}
        </Box>
      ) : (
        <Text style={{ color: color.Critical.Main }}>
          {`Registration is not available on "${server}" homeserver.`}
        </Text>
      )}
    </Box>
  );
}
