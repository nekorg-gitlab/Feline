import { Box, config, Icon, Icons, Text } from 'folds';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import React from 'react';
import { Room } from 'matrix-js-sdk';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useAuthenticatedMxcUrl } from '../../hooks/useAuthenticatedMxcUrl';
import { StackedAvatar } from '../../components/stacked-avatar';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { getMouseEventCords } from '../../utils/dom';
import * as css from './styles.css';

type MemberGlanceProps = {
  room: Room;
  members: CallMembership[];
  speakers: Set<string>;
  max?: number;
};
function MemberGlanceItem({
  room,
  callMember,
  isSpeaker,
}: {
  room: Room;
  callMember: CallMembership;
  isSpeaker: boolean;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const openUserProfile = useOpenUserRoomProfile();
  const userId = callMember.userId;
  if (!userId) return null;
  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const directUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96) ?? undefined
    : undefined;
  const authUrl = useAuthenticatedMxcUrl(avatarMxc, 96, 96);
  const avatarUrl = useAuthentication ? authUrl : directUrl;

  return (
    <StackedAvatar
      className={isSpeaker ? css.SpeakerAvatarOutline : undefined}
      title={name}
      as="button"
      variant="Background"
      size="200"
      radii="Pill"
      onClick={(evt) =>
        openUserProfile(room.roomId, undefined, userId, getMouseEventCords(evt.nativeEvent), 'Top')
      }
    >
      <UserAvatar
        userId={userId}
        src={avatarUrl}
        alt={name}
        renderFallback={() => <Icon size="50" src={Icons.User} filled />}
      />
    </StackedAvatar>
  );
}

export function MemberGlance({ room, members, speakers, max = 6 }: MemberGlanceProps) {
  const visibleMembers = members.slice(0, max);
  const remainingCount = max && members.length > max ? members.length - max : 0;

  return (
    <Box alignItems="Center">
      {visibleMembers.map((callMember) => (
        <MemberGlanceItem
          key={callMember.memberId}
          room={room}
          callMember={callMember}
          isSpeaker={speakers.has(callMember.sender)}
        />
      ))}
      {remainingCount > 0 && (
        <Text size="L400" style={{ paddingLeft: config.space.S100 }}>
          +{remainingCount}
        </Text>
      )}
    </Box>
  );
}
