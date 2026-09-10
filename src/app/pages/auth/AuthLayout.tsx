import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Header, Icon, Icons, Line, Spinner, Text, color, config } from 'folds';
import {
  Outlet,
  generatePath,
  matchPath,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import classNames from 'classnames';

import { AuthFooter } from './AuthFooter';
import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';
import { clientDefaultServer, useClientConfig } from '../../hooks/useClientConfig';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { LOGIN_PATH, REGISTER_PATH, RESET_PASSWORD_PATH } from '../paths';
import FelineSVG from '../../../../public/res/svg/feline.svg';
import { ServerPicker } from './ServerPicker';
import { AutoDiscoveryAction, autoDiscovery } from '../../cs-api';
import { SpecVersionsLoader } from '../../components/SpecVersionsLoader';
import { SpecVersionsProvider } from '../../hooks/useSpecVersions';
import { AutoDiscoveryInfoProvider } from '../../hooks/useAutoDiscoveryInfo';
import { AuthFlowsLoader } from '../../components/AuthFlowsLoader';
import { AuthFlowsProvider } from '../../hooks/useAuthFlows';
import { AuthServerProvider } from '../../hooks/useAuthServer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { tryDecodeURIComponent } from '../../utils/dom';
import { PasswordLoginForm } from './login/PasswordLoginForm';
import { getSessions, isAddingAccount, setAddingAccount } from '../../state/sessions';
import { getHomePath } from '../pathUtils';
import { TauriDeepLinkAuth } from './TauriDeepLinkAuth';
import { MobileStatusScrim } from '../MobileFriendly';

const currentAuthPath = (pathname: string): string => {
  if (matchPath(LOGIN_PATH, pathname)) {
    return LOGIN_PATH;
  }
  if (matchPath(RESET_PASSWORD_PATH, pathname)) {
    return RESET_PASSWORD_PATH;
  }
  if (matchPath(REGISTER_PATH, pathname)) {
    return REGISTER_PATH;
  }
  return LOGIN_PATH;
};

function AuthLayoutLoading({ message }: { message: string }) {
  return (
    <Box justifyContent="Center" alignItems="Center" gap="200">
      <Spinner size="100" variant="Secondary" />
      <Text align="Center" size="T300">
        {message}
      </Text>
    </Box>
  );
}

function AuthLayoutError({ message }: { message: string }) {
  return (
    <Box justifyContent="Center" alignItems="Center" gap="200">
      <Text align="Center" style={{ color: color.Critical.Main }} size="T300">
        {message}
      </Text>
    </Box>
  );
}

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { server: urlEncodedServer } = useParams();

  const clientConfig = useClientConfig();

  const defaultServer = clientDefaultServer(clientConfig);
  const server: string = urlEncodedServer ? tryDecodeURIComponent(urlEncodedServer) : defaultServer;

  const [discoveryState, discoverServer] = useAsyncCallback(
    useCallback(async (serverName: string) => {
      const response = await autoDiscovery(fetch, serverName);
      return {
        serverName,
        response,
      };
    }, []),
  );

  useEffect(() => {
    if (server) discoverServer(server);
  }, [discoverServer, server]);

  useEffect(() => {
    if (!urlEncodedServer || tryDecodeURIComponent(urlEncodedServer) !== server) {
      navigate(
        generatePath(currentAuthPath(location.pathname), {
          server: encodeURIComponent(server),
        }),
        { replace: true },
      );
    }
  }, [urlEncodedServer, navigate, location, server]);

  const selectServer = useCallback(
    (newServer: string) => {
      if (newServer === server) {
        if (discoveryState.status === AsyncStatus.Loading) return;
        discoverServer(server);
        return;
      }
      navigate(
        generatePath(currentAuthPath(location.pathname), { server: encodeURIComponent(newServer) }),
      );
    },
    [navigate, location, discoveryState, server, discoverServer],
  );

  const [autoDiscoveryError, autoDiscoveryInfo] =
    discoveryState.status === AsyncStatus.Success ? discoveryState.data.response : [];

  const [showAdvanced, setShowAdvanced] = useState(false);
  const addingAccount = isAddingAccount();
  const existingCount = getSessions().length;
  // Dotted backdrop only suits roomy desktop layouts; phones get full-bleed card.
  const dotsBackdrop =
    useScreenSizeContext() === ScreenSize.Mobile ? undefined : PatternsCss.BackgroundDotPattern;

  const handleCancelAdd = useCallback(() => {
    setAddingAccount(false);
    navigate(getHomePath(), { replace: true });
  }, [navigate]);

  return (
    <Box
      className={classNames(css.AuthLayout, dotsBackdrop)}
      direction="Column"
      alignItems="Center"
      gap="400"
    >
      <MobileStatusScrim />
      <TauriDeepLinkAuth />
      <Box direction="Column" shrink="No" className={css.AuthCard}>
        <Header className={css.AuthHeader} size="600" variant="Surface">
          <Box grow="Yes" direction="Row" gap="300" alignItems="Center">
            <img className={css.AuthLogo} src={FelineSVG} alt="Feline Logo" />
            <Text size="H3">Feline</Text>
          </Box>
        </Header>
        <Box className={css.AuthCardContent} direction="Column">
          {addingAccount && existingCount > 0 && (
            <Box
              direction="Column"
              gap="200"
              style={{
                backgroundColor: color.Secondary.Container,
                padding: config.space.S300,
                borderRadius: config.radii.R400,
              }}
            >
              <Text size="L400">Adding account ({existingCount} saved)</Text>
              <Text size="T300" priority="300">
                You are signed in. Logging in here adds another account and switches to it.
              </Text>
              <Button variant="Secondary" size="300" outlined onClick={handleCancelAdd}>
                <Text as="span" size="B300">
                  Cancel and go back
                </Text>
              </Button>
            </Box>
          )}
          {discoveryState.status === AsyncStatus.Loading && (
            <AuthLayoutLoading message="Looking for homeserver..." />
          )}
          {discoveryState.status === AsyncStatus.Error && (
            <AuthLayoutError message="Failed to find homeserver." />
          )}
          {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_PROMPT && (
            <AuthLayoutError
              message={`Failed to connect. Homeserver configuration found with ${autoDiscoveryError.host} appears unusable.`}
            />
          )}
          {autoDiscoveryError?.action === AutoDiscoveryAction.FAIL_ERROR && (
            <AuthLayoutError message="Failed to connect. Homeserver configuration base_url appears invalid." />
          )}
          {discoveryState.status === AsyncStatus.Success && autoDiscoveryInfo ? (
            <AuthServerProvider value={discoveryState.data.serverName}>
              <AutoDiscoveryInfoProvider value={autoDiscoveryInfo}>
                <SpecVersionsLoader
                  baseUrl={autoDiscoveryInfo['m.homeserver'].base_url}
                  fallback={() => (
                    <AuthLayoutLoading
                      message={`Connecting to ${autoDiscoveryInfo['m.homeserver'].base_url}`}
                    />
                  )}
                  error={() => (
                    <>
                      <AuthLayoutError message="Failed to connect. Either homeserver is unavailable at this moment or does not exist." />
                      <Line size="300" variant="Surface" direction="Horizontal" />
                      <Box direction="Column" gap="200">
                        <Button
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          outlined
                          onClick={() => setShowAdvanced((v) => !v)}
                          after={
                            <Icon
                              size="100"
                              src={Icons.ChevronBottom}
                              style={{
                                transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 150ms ease',
                              }}
                            />
                          }
                          aria-pressed={showAdvanced}
                        >
                          <Text as="span" size="B300">
                            Advanced
                          </Text>
                        </Button>
                        <Text size="T200" priority="300" align="Center">
                          If you want to choose a custom Matrix homeserver, click Advanced.
                        </Text>
                        {showAdvanced && (
                          <Box direction="Column" gap="100">
                            <Text as="label" size="L400" priority="300">
                              Homeserver
                            </Text>
                            <ServerPicker
                              server={server}
                              serverList={clientConfig.homeserverList ?? []}
                              allowCustomServer={clientConfig.allowCustomHomeservers}
                              onServerChange={selectServer}
                            />
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                >
                  {(specVersions) => (
                    <SpecVersionsProvider value={specVersions}>
                      <AuthFlowsLoader
                        fallback={() => (
                          <AuthLayoutLoading message="Loading authentication flow..." />
                        )}
                        error={() => (
                          <>
                            <AuthLayoutError message="Failed to get authentication flow information." />
                            <Line size="300" variant="Surface" direction="Horizontal" />
                            <Box direction="Column" gap="200">
                              <Button
                                variant="Secondary"
                                fill="Soft"
                                size="300"
                                outlined
                                onClick={() => setShowAdvanced((v) => !v)}
                                after={
                                  <Icon
                                    size="100"
                                    src={Icons.ChevronBottom}
                                    style={{
                                      transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 150ms ease',
                                    }}
                                  />
                                }
                                aria-pressed={showAdvanced}
                              >
                                <Text as="span" size="B300">
                                  Advanced
                                </Text>
                              </Button>
                              <Text size="T200" priority="300" align="Center">
                                If you want to choose a custom Matrix homeserver, click Advanced.
                              </Text>
                              {showAdvanced && (
                                <Box direction="Column" gap="100">
                                  <Text as="label" size="L400" priority="300">
                                    Homeserver
                                  </Text>
                                  <ServerPicker
                                    server={server}
                                    serverList={clientConfig.homeserverList ?? []}
                                    allowCustomServer={clientConfig.allowCustomHomeservers}
                                    onServerChange={selectServer}
                                  />
                                </Box>
                              )}
                            </Box>
                          </>
                        )}
                      >
                        {(authFlows) => {
                          const isLoginPath = !!matchPath(LOGIN_PATH, location.pathname);
                          const hasPasswordFlow = authFlows.loginFlows.flows.some(
                            (f) => f.type === 'm.login.password',
                          );
                          return (
                            <AuthFlowsProvider value={authFlows}>
                              <Outlet />
                              <Line size="300" variant="Surface" direction="Horizontal" />
                              <Box direction="Column" gap="200">
                                <Button
                                  variant="Secondary"
                                  fill="Soft"
                                  size="300"
                                  outlined
                                  onClick={() => setShowAdvanced((v) => !v)}
                                  after={
                                    <Icon
                                      size="100"
                                      src={Icons.ChevronBottom}
                                      style={{
                                        transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 150ms ease',
                                      }}
                                    />
                                  }
                                  aria-pressed={showAdvanced}
                                >
                                  <Text as="span" size="B300">
                                    Advanced
                                  </Text>
                                </Button>
                                <Text size="T200" priority="300" align="Center">
                                  If you want to choose a custom Matrix homeserver, click Advanced.
                                </Text>
                                {showAdvanced && (
                                  <Box direction="Column" gap="400">
                                    <Box direction="Column" gap="100">
                                      <Text as="label" size="L400" priority="300">
                                        Homeserver
                                      </Text>
                                      <ServerPicker
                                        server={server}
                                        serverList={clientConfig.homeserverList ?? []}
                                        allowCustomServer={clientConfig.allowCustomHomeservers}
                                        onServerChange={selectServer}
                                      />
                                    </Box>
                                    {isLoginPath && hasPasswordFlow && (
                                      <>
                                        <Line size="300" variant="Surface" direction="Horizontal" />
                                        <Box direction="Column" gap="200">
                                          <Text size="L400" priority="300">
                                            Sign in with password
                                          </Text>
                                          <PasswordLoginForm />
                                        </Box>
                                      </>
                                    )}
                                    {isLoginPath && !hasPasswordFlow && (
                                      <Text size="T200" priority="300">
                                        Password login is not available on this homeserver.
                                      </Text>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            </AuthFlowsProvider>
                          );
                        }}
                      </AuthFlowsLoader>
                    </SpecVersionsProvider>
                  )}
                </SpecVersionsLoader>
              </AutoDiscoveryInfoProvider>
            </AuthServerProvider>
          ) : (
            <>
              <Line size="300" variant="Surface" direction="Horizontal" />
              <Box direction="Column" gap="200">
                <Button
                  variant="Secondary"
                  fill="Soft"
                  size="300"
                  outlined
                  onClick={() => setShowAdvanced((v) => !v)}
                  after={
                    <Icon
                      size="100"
                      src={Icons.ChevronBottom}
                      style={{
                        transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  }
                  aria-pressed={showAdvanced}
                >
                  <Text as="span" size="B300">
                    Advanced
                  </Text>
                </Button>
                <Text size="T200" priority="300" align="Center">
                  If you want to choose a custom Matrix homeserver, click Advanced.
                </Text>
                {showAdvanced && (
                  <Box direction="Column" gap="100">
                    <Text as="label" size="L400" priority="300">
                      Homeserver
                    </Text>
                    <ServerPicker
                      server={server}
                      serverList={clientConfig.homeserverList ?? []}
                      allowCustomServer={clientConfig.allowCustomHomeservers}
                      onServerChange={selectServer}
                    />
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
      <AuthFooter />
    </Box>
  );
}
