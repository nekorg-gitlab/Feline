import { atom, useSetAtom } from 'jotai';
import { ClientEvent, MatrixClient, MatrixEvent, User, UserEvent } from 'matrix-js-sdk';
import { useEffect } from 'react';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getAccountData, getMDirects } from '../utils/room';

export type MDirectAction = {
  type: 'INITIALIZE' | 'UPDATE';
  rooms: Set<string>;
};

const baseMDirectAtom = atom(new Set<string>());
export const mDirectAtom = atom<Set<string>, [MDirectAction], undefined>(
  (get) => get(baseMDirectAtom),
  (get, set, action) => {
    set(baseMDirectAtom, action.rooms);
  },
);

export const useBindMDirectAtom = (mx: MatrixClient, mDirect: typeof mDirectAtom) => {
  const setMDirect = useSetAtom(mDirect);

  useEffect(() => {
    const recalculateDirectRooms = (directRooms: Set<string>) => {
      directRooms.forEach((roomId) => {
        const room = mx.getRoom(roomId);
        if (room) {
          room.recalculate();
        }
      });
    };

    const mDirectEvent = getAccountData(mx, AccountDataEvent.Direct);
    if (mDirectEvent) {
      const directs = getMDirects(mDirectEvent);
      setMDirect({
        type: 'INITIALIZE',
        rooms: directs,
      });
      recalculateDirectRooms(directs);
    }

    const handleAccountData = (event: MatrixEvent) => {
      if (event.getType() === AccountDataEvent.Direct) {
        const directs = getMDirects(event);
        setMDirect({
          type: 'UPDATE',
          rooms: directs,
        });
        recalculateDirectRooms(directs);
      }
    };

    const handleUserDisplayName = (_event: MatrixEvent | undefined, user: User) => {
      const directEvent = getAccountData(mx, AccountDataEvent.Direct);
      const userIdToDirects = directEvent?.getContent<Record<string, string[]>>();
      const roomIds = userIdToDirects?.[user.userId];
      if (Array.isArray(roomIds)) {
        roomIds.forEach((roomId) => {
          const room = mx.getRoom(roomId);
          if (room) {
            room.recalculate();
          }
        });
      }
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    mx.on(UserEvent.DisplayName, handleUserDisplayName);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
      mx.removeListener(UserEvent.DisplayName, handleUserDisplayName);
    };
  }, [mx, setMDirect]);
};
