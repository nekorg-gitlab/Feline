import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  config,
  Icon,
  IconButton,
  Icons,
  IconSrc,
  MenuItem,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import { useAnimationDuration } from '../../hooks/useAnimationDuration';
import FocusTrap from 'focus-trap-react';
import { General } from './general';
import { PageNav, PageNavContent, PageNavHeader, PageRoot } from '../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { Account } from './account';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useAuthenticatedMxcUrl } from '../../hooks/useAuthenticatedMxcUrl';
import { UserAvatar } from '../../components/user-avatar';
import { nameInitials } from '../../utils/common';
import { Notifications } from './notifications';
import { Devices } from './devices';
import { EmojisStickers } from './emojis-stickers';
import { DeveloperTools } from './developer-tools';
import { About } from './about';
import { Support } from './support';
import { AppearancePage } from './appearance';
import { UseStateProvider } from '../../components/UseStateProvider';
import { stopPropagation } from '../../utils/keyboard';
import { LogoutDialog } from '../../components/LogoutDialog';

export enum SettingsPages {
  GeneralPage,
  AccountPage,
  NotificationPage,
  DevicesPage,
  EmojisStickersPage,
  AppearancePage,
  DeveloperToolsPage,
  AboutPage,
  SupportPage,
}

type SettingsMenuItem = {
  page: SettingsPages;
  name: string;
  icon: IconSrc;
};

const useSettingsMenuItems = (): SettingsMenuItem[] =>
  useMemo(
    () => [
      {
        page: SettingsPages.GeneralPage,
        name: 'General',
        icon: Icons.Setting,
      },
      {
        page: SettingsPages.AccountPage,
        name: 'Account',
        icon: Icons.User,
      },
      {
        page: SettingsPages.NotificationPage,
        name: 'Notifications',
        icon: Icons.Bell,
      },
      {
        page: SettingsPages.DevicesPage,
        name: 'Devices',
        icon: Icons.Monitor,
      },
      {
        page: SettingsPages.EmojisStickersPage,
        name: 'Emojis & Stickers',
        icon: Icons.Smile,
      },
      {
        page: SettingsPages.AppearancePage,
        name: 'Appearance',
        icon: Icons.Bulb,
      },
      {
        page: SettingsPages.DeveloperToolsPage,
        name: 'Developer Tools',
        icon: Icons.Terminal,
      },
      {
        page: SettingsPages.AboutPage,
        name: 'About',
        icon: Icons.Info,
      },
      {
        page: SettingsPages.SupportPage,
        name: 'Support',
        icon: Icons.Heart,
      },
    ],
    [],
  );

type SettingsProps = {
  initialPage?: SettingsPages;
  requestClose: () => void;
};
export function Settings({ initialPage, requestClose }: SettingsProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId()!;
  const profile = useUserProfile(userId);
  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const directUrl = profile.avatarUrl
    ? (mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const authUrl = useAuthenticatedMxcUrl(profile.avatarUrl, 96, 96, 'crop');
  const avatarUrl = useAuthentication ? authUrl : directUrl;

  const screenSize = useScreenSizeContext();
  const [activePage, setActivePage] = useState<SettingsPages | undefined>(() => {
    if (initialPage) return initialPage;
    return screenSize === ScreenSize.Mobile ? undefined : SettingsPages.GeneralPage;
  });
  const menuItems = useSettingsMenuItems();

  const handlePageRequestClose = () => {
    if (screenSize === ScreenSize.Mobile) {
      setActivePage(undefined);
      return;
    }
    requestClose();
  };

  const duration = useAnimationDuration();
  const [renderedPage, setRenderedPage] = useState(activePage);
  const [prevPage, setPrevPage] = useState<SettingsPages | undefined>(undefined);
  const [isExiting, setIsExiting] = useState(false);
  const prevActiveRef = useRef(activePage);

  useEffect(() => {
    if (prevActiveRef.current === activePage) return;
    const prev = prevActiveRef.current;
    prevActiveRef.current = activePage;

    if (duration === 0) {
      setRenderedPage(activePage);
      setPrevPage(undefined);
      setIsExiting(false);
      return;
    }

    if (prev !== undefined || activePage !== undefined) {
      setPrevPage(prev);
      setRenderedPage(activePage);
      setIsExiting(true);
      const t = setTimeout(() => {
        setPrevPage(undefined);
        setIsExiting(false);
      }, duration);
      return () => clearTimeout(t);
    }
    setRenderedPage(activePage);
  }, [activePage, duration]);

  const renderPage = (page: SettingsPages | undefined) => {
    if (page === SettingsPages.GeneralPage) return <General requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.AccountPage) return <Account requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.NotificationPage)
      return <Notifications requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.DevicesPage) return <Devices requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.EmojisStickersPage)
      return <EmojisStickers requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.AppearancePage)
      return <AppearancePage requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.DeveloperToolsPage)
      return <DeveloperTools requestClose={handlePageRequestClose} />;
    if (page === SettingsPages.AboutPage)
      return <About requestClose={handlePageRequestClose} onSupportClick={() => setActivePage(SettingsPages.SupportPage)} />;
    if (page === SettingsPages.SupportPage) return <Support requestClose={handlePageRequestClose} />;
    return null;
  };

  return (
    <PageRoot
      nav={
        screenSize === ScreenSize.Mobile && activePage !== undefined ? undefined : (
          <PageNav size="300">
            <PageNavHeader outlined={false}>
              <Box grow="Yes" gap="200">
                <Avatar size="200" radii="300">
                  <UserAvatar
                    userId={userId}
                    src={avatarUrl}
                    renderFallback={() => <Text size="H6">{nameInitials(displayName)}</Text>}
                  />
                </Avatar>
                <Text size="H4" truncate>
                  Settings
                </Text>
              </Box>
              <Box shrink="No">
                {screenSize === ScreenSize.Mobile && (
                  <IconButton onClick={requestClose} variant="Background">
                    <Icon src={Icons.Cross} />
                  </IconButton>
                )}
              </Box>
            </PageNavHeader>
            <Box grow="Yes" direction="Column">
              <PageNavContent>
                <div style={{ flexGrow: 1 }}>
                  {menuItems.map((item) => (
                    <MenuItem
                      key={item.name}
                      variant="Background"
                      radii="400"
                      aria-pressed={activePage === item.page}
                      before={<Icon src={item.icon} size="100" filled={activePage === item.page} />}
                      onClick={() => setActivePage(item.page)}
                    >
                      <Text
                        style={{
                          fontWeight: activePage === item.page ? config.fontWeight.W600 : undefined,
                        }}
                        size="T300"
                        truncate
                      >
                        {item.name}
                      </Text>
                    </MenuItem>
                  ))}
                </div>
              </PageNavContent>
              <Box style={{ padding: config.space.S200 }} shrink="No" direction="Column">
                <UseStateProvider initial={false}>
                  {(logout, setLogout) => (
                    <>
                      <Button
                        size="300"
                        variant="Critical"
                        fill="None"
                        radii="Pill"
                        before={<Icon src={Icons.Power} size="100" />}
                        onClick={() => setLogout(true)}
                      >
                        <Text size="B400">Logout</Text>
                      </Button>
                      {logout && (
                        <Overlay open backdrop={<OverlayBackdrop />}>
                          <OverlayCenter>
                            <FocusTrap
                              focusTrapOptions={{
                                onDeactivate: () => setLogout(false),
                                clickOutsideDeactivates: true,
                                escapeDeactivates: stopPropagation,
                              }}
                            >
                              <LogoutDialog handleClose={() => setLogout(false)} />
                            </FocusTrap>
                          </OverlayCenter>
                        </Overlay>
                      )}
                    </>
                  )}
                </UseStateProvider>
              </Box>
            </Box>
          </PageNav>
        )
      }
    >
      <div className="feline-page-stack">
        {prevPage !== undefined && isExiting && (
          <div className="feline-page-exit" aria-hidden>
            {renderPage(prevPage)}
          </div>
        )}
        <div
          key={renderedPage ?? 'empty'}
          className={isExiting && prevPage !== undefined ? 'feline-page-enter' : undefined}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {renderPage(renderedPage)}
        </div>
      </div>
    </PageRoot>
  );
}
