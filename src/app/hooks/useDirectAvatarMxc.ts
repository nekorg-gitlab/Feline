import { useEffect, useState } from 'react';
import { Room, RoomMemberEvent, UserEvent } from 'matrix-js-sdk';
import { getDirectAvatarMxc, getDirectUserId } from '../utils/room';

export const useDirectAvatarMxc = (room: Room | undefined, enabled = true): string | undefined => {
  const mx = room?.client;
  const roomId = room?.roomId;

  const [avatarMxc, setAvatarMxc] = useState<string | undefined>(() =>
    enabled && mx && roomId ? getDirectAvatarMxc(mx, roomId) : undefined,
  );

  useEffect(() => {
    if (!enabled || !mx || !roomId) return undefined;
    let disposed = false;
    const currentRoom = mx.getRoom(roomId);
    if (!currentRoom) return undefined;

    const update = () => {
      if (disposed) return;
      setAvatarMxc(getDirectAvatarMxc(mx, roomId));
    };

    update();

    const handleMembership = (_event: unknown, member: { roomId?: string }) => {
      if (member?.roomId === roomId) update();
    };
    const handleName = (_event: unknown, member: { roomId?: string }) => {
      if (member?.roomId === roomId) update();
    };
    const dmUserId = getDirectUserId(mx, roomId);
    const handleUserAvatar = (_event: unknown, user: { userId?: string }) => {
      if (user?.userId && dmUserId && user.userId === dmUserId) update();
    };

    mx.on(RoomMemberEvent.Membership, handleMembership as never);
    mx.on(RoomMemberEvent.Name, handleName as never);
    mx.on(UserEvent.AvatarUrl, handleUserAvatar as never);

    currentRoom
      .loadMembersIfNeeded()
      .then(() => update())
      .catch(() => {});

    if (!getDirectAvatarMxc(mx, roomId) && dmUserId && !mx.getUser(dmUserId)?.avatarUrl) {
      mx.getProfileInfo(dmUserId)
        .then((info) => {
          if (disposed) return;
          if (info?.avatar_url && !getDirectAvatarMxc(mx, roomId)) {
            setAvatarMxc(info.avatar_url);
          }
        })
        .catch(() => {});
    }

    return () => {
      disposed = true;
      mx.removeListener(RoomMemberEvent.Membership, handleMembership as never);
      mx.removeListener(RoomMemberEvent.Name, handleName as never);
      mx.removeListener(UserEvent.AvatarUrl, handleUserAvatar as never);
    };
  }, [mx, roomId, enabled]);

  return avatarMxc;
};
