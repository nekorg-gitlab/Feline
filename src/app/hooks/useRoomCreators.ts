import { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { useStateEvent } from './useStateEvent';
import { IRoomCreateContent, StateEvent } from '../../types/matrix/room';
import { creatorsSupported } from '../utils/matrix';
import { getStateEvent } from '../utils/room';

export const getRoomCreators = (createEvent: MatrixEvent): Set<string> => {
  const createContent = createEvent.getContent<IRoomCreateContent>();
  if (!creatorsSupported(createContent.room_version)) return new Set();
  const additional = Array.isArray(createContent.additional_creators)
    ? createContent.additional_creators
    : [];
  return new Set(
    [createEvent.event.sender, ...additional].filter(
      (creator): creator is string => typeof creator === 'string',
    ),
  );
};

export const useRoomCreators = (room: Room): Set<string> => {
  const createEvent = useStateEvent(room, StateEvent.RoomCreate);
  return useMemo(
    () => (createEvent ? getRoomCreators(createEvent) : new Set<string>()),
    [createEvent],
  );
};

export const getRoomCreatorsForRoomId = (mx: MatrixClient, roomId: string): Set<string> => {
  const room = mx.getRoom(roomId);
  const createEvent = room ? getStateEvent(room, StateEvent.RoomCreate) : undefined;
  return createEvent ? getRoomCreators(createEvent) : new Set();
};
