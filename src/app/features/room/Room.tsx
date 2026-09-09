import React, { useCallback } from 'react';
import { Box, Line } from 'folds';
import { useNavigate, useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtomValue } from 'jotai';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useKeyDown } from '../../hooks/useKeyDown';
import { markAsRead } from '../../utils/notifications';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { CallView } from '../call/CallView';
import { RoomViewHeader } from './RoomViewHeader';
import { callChatAtom } from '../../state/callEmbed';
import { CallChatView } from './CallChatView';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { getHomePath, decodePathParam } from '../../pages/pathUtils';
import { useSelectedSpace } from '../../hooks/router/useSelectedSpace';
import * as css from '../../components/page/style.css';

export function Room() {
  const { eventId: rawEventId } = useParams();
  const eventId = rawEventId ? decodePathParam(rawEventId) : undefined;
  const room = useRoom();
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const spaceId = useSelectedSpace();

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(callSession);
  const callEmbed = useCallEmbed();

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const screenSize = useScreenSizeContext();
  const powerLevels = usePowerLevels(room);
  const members = useRoomMembers(mx, room.roomId);
  const chat = useAtomValue(callChatAtom);

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          const portalContainer = document.getElementById('portalContainer');
          if (portalContainer && portalContainer.children.length > 0) {
            markAsRead(mx, room.roomId, hideActivity);
            return;
          }
          markAsRead(mx, room.roomId, hideActivity);
          if (spaceId) return;
          navigate(getHomePath());
        }
      },
      [mx, room.roomId, hideActivity, navigate, spaceId],
    ),
  );

  const callView = callEmbed?.roomId === room.roomId || room.isCallRoom() || callMembers.length > 0;

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes">
        {callView && (screenSize === ScreenSize.Desktop || !chat) && (
          <Box grow="Yes" direction="Column" className={css.ChatPane}>
            <RoomViewHeader callView />
            <Box grow="Yes">
              <CallView />
            </Box>
          </Box>
        )}
        {!callView && (
          <Box grow="Yes" direction="Column" className={css.ChatPane}>
            <RoomViewHeader />
            <Box grow="Yes">
              <RoomView eventId={eventId} />
            </Box>
          </Box>
        )}

        {callView && chat && (
          <>
            {screenSize === ScreenSize.Desktop && (
              <Line
                variant="Background"
                direction="Vertical"
                size="300"
                data-feline-pane-divider=""
              />
            )}
            <CallChatView />
          </>
        )}
        {!callView && screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line
              variant="Background"
              direction="Vertical"
              size="300"
              data-feline-pane-divider=""
            />
            <MembersDrawer key={room.roomId} room={room} members={members} />
          </>
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
