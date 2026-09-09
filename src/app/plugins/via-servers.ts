import { Room } from 'matrix-js-sdk';
import { IPowerLevels } from '../hooks/usePowerLevels';
import { creatorsSupported, getMxIdServer } from '../utils/matrix';
import { IRoomCreateContent, StateEvent } from '../../types/matrix/room';
import { getStateEvent } from '../utils/room';

export const getViaServers = (room: Room): string[] => {
  const getHighestPowerUserId = (): string | undefined => {
    const creatorEvent = getStateEvent(room, StateEvent.RoomCreate);
    if (
      creatorEvent &&
      creatorsSupported(creatorEvent.getContent<IRoomCreateContent>().room_version)
    ) {
      return creatorEvent.getSender();
    }
    const powerLevels = getStateEvent(room, StateEvent.RoomPowerLevels)?.getContent<IPowerLevels>();
    const userIdToPower = powerLevels?.users;
    if (!userIdToPower) return undefined;
    const defaultPower = powerLevels.users_default ?? 0;
    return Object.keys(userIdToPower)
      .filter((userId) => userIdToPower[userId] > defaultPower)
      .sort((a, b) => userIdToPower[b] - userIdToPower[a])[0];
  };

  const serverToPop: Record<string, number> = {};
  room.getMembers()?.forEach((member) => {
    const server = getMxIdServer(member.userId);
    if (server) serverToPop[server] = (serverToPop[server] ?? 0) + 1;
  });

  const powerUserServer = getMxIdServer(getHighestPowerUserId() ?? '');
  const via = powerUserServer ? [powerUserServer] : [];
  const mostPop = Object.keys(serverToPop)
    .sort((a, b) => serverToPop[b] - serverToPop[a])
    .filter((server) => !via.includes(server))
    .slice(0, via.length === 0 ? 3 : 2);
  return via.concat(mostPop);
};
