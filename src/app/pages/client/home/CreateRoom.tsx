import React, { useCallback } from 'react';
import { Box, Icon, Icons, Scroll, IconButton } from 'folds';
import { useNavigate } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { getHomePath } from '../../pathUtils';
import {
  Page,
  PageContent,
  PageContentCenter,
  PageHeader,
  PageHero,
  PageHeroSection,
} from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { CreateRoomForm } from '../../../features/create-room';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';

export function HomeCreateRoom() {
  const screenSize = useScreenSizeContext();
  const navigate = useNavigate();

  const { navigateRoom } = useRoomNavigate();

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          const portalContainer = document.getElementById('portalContainer');
          if (portalContainer && portalContainer.children.length > 0) return;
          navigate(getHomePath());
        }
      },
      [navigate]
    )
  );

  return (
    <Page>
      {screenSize === ScreenSize.Mobile && (
        <PageHeader balance outlined={false}>
          <Box grow="Yes" alignItems="Center" gap="200">
            <BackRouteHandler>
              {(onBack) => (
                <IconButton onClick={onBack}>
                  <Icon src={Icons.ArrowLeft} />
                </IconButton>
              )}
            </BackRouteHandler>
          </Box>
        </PageHeader>
      )}
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <PageHeroSection>
                <Box direction="Column" gap="700">
                  <PageHero
                    icon={<Icon size="600" src={Icons.Hash} />}
                    title="Create Room"
                    subTitle="Build a Room for Real-Time Conversations."
                  />
                  <CreateRoomForm onCreate={navigateRoom} />
                </Box>
              </PageHeroSection>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
