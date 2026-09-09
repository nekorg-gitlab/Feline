import { useParams } from 'react-router-dom';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../utils/matrix';
import { useMatrixClient } from '../useMatrixClient';
import { decodePathParam } from '../../pages/pathUtils';

export const useSelectedRoom = (): string | undefined => {
  const mx = useMatrixClient();

  const { roomIdOrAlias: raw } = useParams();
  const roomIdOrAlias = raw ? decodePathParam(raw) : undefined;
  const roomId =
    roomIdOrAlias && isRoomAlias(roomIdOrAlias)
      ? getCanonicalAliasRoomId(mx, roomIdOrAlias)
      : roomIdOrAlias;

  return roomId;
};
