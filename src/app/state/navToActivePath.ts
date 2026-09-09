import { WritableAtom, atom } from 'jotai';
import { produce } from 'immer';
import { Path } from 'react-router-dom';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';
import { normalizeStoredPathname } from '../pages/pathUtils';

const NAV_TO_ACTIVE_PATH = 'navToActivePath';

const getStoreKey = (userId: string): string => `${NAV_TO_ACTIVE_PATH}${userId}`;

type NavToActivePath = Map<string, Path>;

type NavToActivePathAction =
  | {
      type: 'PUT';
      navId: string;
      path: Path;
    }
  | {
      type: 'DELETE';
      navId: string;
    };

export type NavToActivePathAtom = WritableAtom<NavToActivePath, [NavToActivePathAction], undefined>;

export const makeNavToActivePathAtom = (userId: string): NavToActivePathAtom => {
  const storeKey = getStoreKey(userId);

  const baseNavToActivePathAtom = atomWithLocalStorage<NavToActivePath>(
    storeKey,
    (key) => {
      const obj: Record<string, Path> = getLocalStorageItem(key, {});
      return new Map(Object.entries(obj));
    },
    (key, value) => {
      const obj: Record<string, Path> = Object.fromEntries(value);
      setLocalStorageItem(key, obj);
    },
  );

  const navToActivePathAtom = atom<NavToActivePath, [NavToActivePathAction], undefined>(
    (get) => {
      const stored = get(baseNavToActivePathAtom);
      // Heal entries persisted while encoding bugs stacked extra `%25`
      // layers, so tab clicks never navigate to unresolvable paths.
      const healed = new Map<string, Path>();
      stored.forEach((path, navId) => {
        const pathname = normalizeStoredPathname(path.pathname);
        healed.set(navId, pathname === path.pathname ? path : { ...path, pathname });
      });
      return healed;
    },
    (get, set, action) => {
      if (action.type === 'DELETE') {
        set(
          baseNavToActivePathAtom,
          produce(get(baseNavToActivePathAtom), (draft) => {
            draft.delete(action.navId);
          }),
        );
        return;
      }
      if (action.type === 'PUT') {
        set(
          baseNavToActivePathAtom,
          produce(get(baseNavToActivePathAtom), (draft) => {
            const pathname = normalizeStoredPathname(action.path.pathname);
            draft.set(
              action.navId,
              pathname === action.path.pathname ? action.path : { ...action.path, pathname },
            );
          }),
        );
      }
    },
  );

  return navToActivePathAtom;
};

export const clearNavToActivePathStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
