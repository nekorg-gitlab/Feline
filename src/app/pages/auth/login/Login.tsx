import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Input, Text, color } from 'folds';
import { useSearchParams } from 'react-router-dom';
import { SSOAction, createClient } from 'matrix-js-sdk';
import { useAuthFlows } from '../../../hooks/useAuthFlows';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { TokenLogin } from './TokenLogin';
import { getLoginPath, withSearchParam } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { LoginPathSearchParams } from '../../paths';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { isTauri } from '../../../utils/isTauri';

const getLoginTokenSearchParam = () => {
  const params = new URLSearchParams(window.location.search);
  const loginToken = params.get('loginToken');
  return loginToken ?? undefined;
};

const useLoginSearchParams = (searchParams: URLSearchParams): LoginPathSearchParams =>
  useMemo(
    () => ({
      username: searchParams.get('username') ?? undefined,
      email: searchParams.get('email') ?? undefined,
      loginToken: searchParams.get('loginToken') ?? undefined,
    }),
    [searchParams],
  );

export function Login() {
  const { t } = useTranslation();
  const server = useAuthServer();
  const { hashRouter } = useClientConfig();
  const { loginFlows } = useAuthFlows();
  const [searchParams] = useSearchParams();
  const loginSearchParams = useLoginSearchParams(searchParams);
  const ssoRedirectUrl = usePathWithOrigin(getLoginPath(server));
  const loginTokenForHashRouter = getLoginTokenSearchParam();
  const absoluteLoginPath = usePathWithOrigin(getLoginPath(server));

  if (hashRouter?.enabled && loginTokenForHashRouter) {
    window.location.replace(
      withSearchParam(absoluteLoginPath, {
        loginToken: loginTokenForHashRouter,
      }),
    );
  }

  const parsedFlows = useParsedLoginFlows(loginFlows.flows);
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

  const singleProviderId = useMemo(() => {
    const providers = parsedFlows.sso?.identity_providers;
    if (providers && providers.length === 1) return providers[0].id;
    return undefined;
  }, [parsedFlows.sso]);

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

  const [manualToken, setManualToken] = useState('');
  const [submittedToken, setSubmittedToken] = useState<string | undefined>(undefined);

  if (parsedFlows.token && loginSearchParams.loginToken) {
    return (
      <Box direction="Column" gap="500">
        <TokenLogin token={loginSearchParams.loginToken} />
      </Box>
    );
  }

  if (submittedToken) {
    return (
      <Box direction="Column" gap="500">
        <TokenLogin token={submittedToken} />
      </Box>
    );
  }

  return (
    <Box direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="H2" priority="400">
          {t('Common.welcome')}
        </Text>
        <Text size="T300" priority="300">
          {t('UI.logInOrCreateAnAccountToContinue')}
        </Text>
      </Box>

      {parsedFlows.sso ? (
        <Box direction="Column" gap="300">
          <Button
            as="a"
            href={getSsoUrl(SSOAction.LOGIN)}
            onClick={(evt) => handleSsoClick(evt, getSsoUrl(SSOAction.LOGIN))}
            size="500"
            variant="Primary"
            fill="Solid"
          >
            <Text as="span" size="B500">
              {t('Common.login')}
            </Text>
          </Button>
          <Button
            as="a"
            href={getSsoUrl(SSOAction.REGISTER)}
            onClick={(evt) => handleSsoClick(evt, getSsoUrl(SSOAction.REGISTER))}
            size="500"
            variant="Secondary"
            fill="Soft"
            outlined
          >
            <Text as="span" size="B500">
              {t('Common.register')}
            </Text>
          </Button>
          {isTauri() && (
            <>
              <Text size="T200" priority="300" align="Center">
                {t('UI.thisWillOpenYourBrowserToContinue')}
              </Text>
              <Box direction="Column" gap="100">
                <Text size="L400" priority="300">
                  {t('UI.pasteLoginTokenTauri')}
                </Text>
                <Input
                  value={manualToken}
                  onChange={(evt) => setManualToken(evt.target.value)}
                  placeholder="loginToken from browser URL"
                  variant="Background"
                  size="500"
                  outlined
                />
                <Button
                  variant="Secondary"
                  size="500"
                  outlined
                  disabled={!manualToken.trim()}
                  onClick={() => setSubmittedToken(manualToken.trim())}
                >
                  <Text as="span" size="B500">
                    {t('Common.continueWithToken')}
                  </Text>
                </Button>
              </Box>
            </>
          )}
        </Box>
      ) : (
        <Text style={{ color: color.Critical.Main }}>
          {`Sign-in is not available on "${server}" homeserver.`}
        </Text>
      )}
    </Box>
  );
}
