import React from 'react';
import classNames from 'classnames';
import {
  Avatar,
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  Scroll,
  Text,
  as,
  config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './EventReaders.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { UserAvatar } from '../user-avatar';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useAuthenticatedMxcUrl } from '../../hooks/useAuthenticatedMxcUrl';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { getMouseEventCords } from '../../utils/dom';

function ReaderItem({ room, readerId }: { room: Room; readerId: string }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const openProfile = useOpenUserRoomProfile();
  const space = useSpaceOptionally();
  const name = getMemberDisplayName(room, readerId) ?? getMxIdLocalPart(readerId) ?? readerId;
  const avatarMxcUrl = room.getMember(readerId)?.getMxcAvatarUrl();
  const directUrl = avatarMxcUrl
    ? mx.mxcUrlToHttp(avatarMxcUrl, 100, 100, 'crop', undefined, false, useAuthentication)
    : undefined;
  const authUrl = useAuthenticatedMxcUrl(avatarMxcUrl, 100, 100, 'crop');
  const avatarUrl = useAuthentication ? authUrl : directUrl;

  return (
    <MenuItem
      key={readerId}
      style={{ padding: `0 ${config.space.S200}` }}
      radii="400"
      onClick={(event) => {
        openProfile(room.roomId, space?.roomId, readerId, getMouseEventCords(event.nativeEvent), 'Bottom');
      }}
      before={
        <Avatar size="200">
          <UserAvatar
            userId={readerId}
            src={avatarUrl ?? undefined}
            alt={name}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      }
    >
      <Text size="T400" truncate>
        {name}
      </Text>
    </MenuItem>
  );
}

export type EventReadersProps = {
  room: Room;
  eventId: string;
  requestClose: () => void;
};
export const EventReaders = as<'div', EventReadersProps>(
  ({ className, room, eventId, requestClose, ...props }, ref) => {
    const latestEventReaders = useRoomEventReaders(room, eventId);

    return (
      <Box
        className={classNames(css.EventReaders, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.Header} variant="Surface" size="600">
          <Box grow="Yes">
            <Text size="H3">Seen by</Text>
          </Box>
          <IconButton size="300" onClick={requestClose}>
            <Icon src={Icons.Cross} />
          </IconButton>
        </Header>
        <Box grow="Yes">
          <Scroll visibility="Hover" hideTrack size="300">
            <Box className={css.Content} direction="Column">
              {latestEventReaders.map((readerId) => (
                <ReaderItem key={readerId} room={room} readerId={readerId} />
              ))}
            </Box>
          </Scroll>
        </Box>
      </Box>
    );
  }
);
