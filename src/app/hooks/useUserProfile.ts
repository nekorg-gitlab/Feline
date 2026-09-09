import { useEffect, useState } from 'react';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export const BIO_MAX_BYTES = 65536;
export const BIO_KEY = 'bio';

export const getByteLength = (str: string): number => new TextEncoder().encode(str).length;

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
  bio?: string;
};
export const useUserProfile = (userId: string): UserProfile => {
  const mx = useMatrixClient();

  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = mx.getUser(userId);
    return {
      avatarUrl: user?.avatarUrl,
      displayName: user?.displayName,
    };
  });

  useEffect(() => {
    const user = mx.getUser(userId);
    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatarUrl: myUser.avatarUrl,
      }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        displayName: myUser.displayName,
      }));
    };

    mx.getProfileInfo(userId)
      .then((info) =>
        setProfile((prev) => ({
          ...prev,
          avatarUrl: info.avatar_url,
          displayName: info.displayname,
        })),
      )
      .catch(() => {});

    const fetchBio = async () => {
      try {
        const supported = await mx.doesServerSupportExtendedProfiles().catch(() => false);
        if (!supported) return;
        let bioValue: unknown = undefined;
        let fetched = false;
        try {
          const full = await mx.getExtendedProfile(userId);
          if (full && BIO_KEY in full) {
            bioValue = (full as Record<string, unknown>)[BIO_KEY];
            fetched = true;
          } else {
            setProfile((prev) => {
              if (prev.bio === undefined) return prev;
              const next = { ...prev };
              delete (next as Record<string, unknown>).bio;
              return next;
            });
            return;
          }
        } catch {
          try {
            bioValue = await mx.getExtendedProfileProperty(userId, BIO_KEY);
            fetched = true;
          } catch {
            setProfile((prev) => {
              if (prev.bio === undefined) return prev;
              const next = { ...prev };
              delete (next as Record<string, unknown>).bio;
              return next;
            });
            return;
          }
        }
        if (!fetched) return;
        if (typeof bioValue === 'string') {
          setProfile((prev) => ({ ...prev, bio: bioValue as string }));
        } else if (bioValue !== undefined && bioValue !== null) {
          setProfile((prev) => ({ ...prev, bio: String(bioValue) }));
        } else {
          setProfile((prev) => {
            if (prev.bio === undefined) return prev;
            const next = { ...prev };
            delete (next as Record<string, unknown>).bio;
            return next;
          });
        }
      } catch {}
    };
    fetchBio();

    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);
    return () => {
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId]);

  return profile;
};
