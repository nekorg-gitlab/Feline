import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Input, Text, color } from 'folds';
import { SSOAction, createClient } from 'matrix-js-sdk';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useAuthFlows } from '../../../hooks/useAuthFlows';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { getLoginPath } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { isTauri } from '../../../utils/isTauri';
import { TokenLogin } from '../login/TokenLogin';

export function Register() {
  const { t } = useTranslation();
  const server = useAuthServer();
  const { loginFlows } = useAuthFlows();
  const { sso } = useParsedLoginFlows(loginFlows.flows);
  const ssoRedirectUrl = usePathWithOrigin(getLoginPath(server));
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

  const [manualToken, setManualToken] = useState('');
  const [submittedToken, setSubmittedToken] = useState<string | undefined>(undefined);

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
          {t('Common.createAccount')}
        </Text>
        <Text size="T300" priority="300">
          {t('UI.createANewAccountToGetStarted')}
        </Text>
      </Box>

      {sso ? (
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
          {`Registration is not available on "${server}" homeserver.`}
        </Text>
      )}
    </Box>
  );
}
