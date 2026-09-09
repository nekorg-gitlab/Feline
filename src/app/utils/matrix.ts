import {
  EncryptedAttachmentInfo,
  decryptAttachment,
  encryptAttachment,
} from 'browser-encrypt-attachment';
import {
  EventTimeline,
  MatrixClient,
  MatrixError,
  MatrixEvent,
  Room,
  RoomMember,
  UploadProgress,
  UploadResponse,
} from 'matrix-js-sdk';
import { IImageInfo, IThumbnailContent, IVideoInfo } from '../../types/matrix/common';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getStateEvent } from './room';
import { Membership, StateEvent } from '../../types/matrix/room';
import { getFallbackSession } from '../state/sessions';

const DOMAIN_REGEX = /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/;

export const isServerName = (serverName: string): boolean => DOMAIN_REGEX.test(serverName);

const matchMxId = (id: string): RegExpMatchArray | null => id.match(/^([@$+#])([^\s:]+):(\S+)$/);

const validMxId = (id: string): boolean => !!matchMxId(id);

export const getMxIdServer = (userId: string): string | undefined => matchMxId(userId)?.[3];

export const getMxIdLocalPart = (userId: string): string | undefined => matchMxId(userId)?.[2];

export const isUserId = (id: string): boolean => validMxId(id) && id.startsWith('@');

export const isRoomId = (id: string): boolean => id.startsWith('!');

export const isRoomAlias = (id: string): boolean => validMxId(id) && id.startsWith('#');

export const getCanonicalAliasRoomId = (mx: MatrixClient, alias: string): string | undefined =>
  mx
    .getRooms()
    ?.find(
      (room) =>
        room.getCanonicalAlias() === alias &&
        getStateEvent(room, StateEvent.RoomTombstone) === undefined,
    )?.roomId;

export const getCanonicalAliasOrRoomId = (mx: MatrixClient, roomId: string): string => {
  const room = mx.getRoom(roomId);
  if (!room) return roomId;
  if (getStateEvent(room, StateEvent.RoomTombstone) !== undefined) return roomId;
  const alias = room.getCanonicalAlias();
  if (alias && getCanonicalAliasRoomId(mx, alias) === roomId) {
    return alias;
  }
  return roomId;
};

export const getImageInfo = (img: HTMLImageElement, fileOrBlob: File | Blob): IImageInfo => ({
  w: img.width,
  h: img.height,
  mimetype: fileOrBlob.type,
  size: fileOrBlob.size,
});

export const getVideoInfo = (video: HTMLVideoElement, fileOrBlob: File | Blob): IVideoInfo => ({
  duration: Number.isNaN(video.duration) ? undefined : Math.floor(video.duration * 1000),
  w: video.videoWidth,
  h: video.videoHeight,
  mimetype: fileOrBlob.type,
  size: fileOrBlob.size,
});

export const getThumbnailContent = (thumbnailInfo: {
  thumbnail: File | Blob;
  encInfo: EncryptedAttachmentInfo | undefined;
  mxc: string;
  width: number;
  height: number;
}): IThumbnailContent => {
  const { thumbnail, encInfo, mxc, width, height } = thumbnailInfo;

  const content: IThumbnailContent = {
    thumbnail_info: {
      mimetype: thumbnail.type,
      size: thumbnail.size,
      w: width,
      h: height,
    },
    ...(encInfo ? { thumbnail_file: { ...encInfo, url: mxc } } : { thumbnail_url: mxc }),
  };
  return content;
};

export const encryptFile = async (
  file: File | Blob,
): Promise<{
  encInfo: EncryptedAttachmentInfo;
  file: File;
  originalFile: File | Blob;
}> => {
  const encryptedAttachment = await encryptAttachment(await file.arrayBuffer());
  const filename = file instanceof File ? file.name : 'file';
  return {
    encInfo: encryptedAttachment.info,
    file: new File([encryptedAttachment.data], filename, { type: file.type }),
    originalFile: file,
  };
};

export const decryptFile = async (
  dataBuffer: ArrayBuffer,
  type: string,
  encInfo: EncryptedAttachmentInfo,
): Promise<Blob> => new Blob([await decryptAttachment(dataBuffer, encInfo)], { type });

export type TUploadContent = File;

export type ContentUploadOptions = {
  name?: string;
  fileType?: string;
  hideFilename?: boolean;
  onPromise?: (promise: Promise<UploadResponse>) => void;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess: (mxc: string) => void;
  onError: (error: MatrixError) => void;
};

export const uploadContent = async (
  mx: MatrixClient,
  file: TUploadContent,
  options: ContentUploadOptions,
) => {
  const { name, fileType, hideFilename, onProgress, onPromise, onSuccess, onError } = options;

  const uploadPromise = mx.uploadContent(file, {
    name,
    type: fileType,
    includeFilename: !hideFilename,
    progressHandler: onProgress,
  });
  onPromise?.(uploadPromise);
  try {
    const data = await uploadPromise;
    const mxc = data.content_uri;
    if (mxc) onSuccess(mxc);
    else onError(new MatrixError(data));
  } catch (e: any) {
    const error = typeof e?.message === 'string' ? e.message : undefined;
    const errcode = typeof e?.errcode === 'string' ? e.errcode : undefined;
    onError(new MatrixError({ error, errcode }));
  }
};

export const matrixEventByRecency = (m1: MatrixEvent, m2: MatrixEvent) => m2.getTs() - m1.getTs();

export const factoryEventSentBy = (senderId: string) => (ev: MatrixEvent) =>
  ev.getSender() === senderId;

export const eventWithShortcode = (ev: MatrixEvent) =>
  typeof ev.getContent().shortcode === 'string';

export const getDMRoomFor = (mx: MatrixClient, userId: string): Room | undefined => {
  const dmLikeRooms = mx
    .getRooms()
    .filter(
      (room) =>
        room.getMyMembership() === Membership.Join &&
        room.hasEncryptionStateEvent() &&
        room.getMembers().length <= 2,
    );

  return dmLikeRooms.find((room) => room.getMember(userId));
};

export const guessDmRoomUserId = (room: Room, myUserId: string): string => {
  const getOldestMember = (members: RoomMember[]): RoomMember | undefined => {
    let oldestMemberTs: number | undefined;
    let oldestMember: RoomMember | undefined;
    members.forEach((member) => {
      if (member.userId === myUserId) return;
      const ts = member.events.member?.getTs();
      if (oldestMemberTs === undefined || (ts !== undefined && ts < oldestMemberTs)) {
        oldestMember = member;
        oldestMemberTs = ts;
      }
    });
    return oldestMember;
  };

  return (
    getOldestMember(room.getJoinedMembers())?.userId ??
    getOldestMember(room.getLiveTimeline().getState(EventTimeline.FORWARDS)?.getMembers() ?? [])
      ?.userId ??
    myUserId
  );
};

const getMDirectMap = (mx: MatrixClient): Record<string, string[]> => {
  const event = mx.getAccountData(AccountDataEvent.Direct as any);
  return event ? structuredClone(event.getContent()) : {};
};

const removeRoomFromAll = (map: Record<string, string[]>, roomId: string, except?: string) => {
  Object.entries(map).forEach(([targetUserId, roomIds]) => {
    if (targetUserId === except) return;
    const index = roomIds.indexOf(roomId);
    if (index > -1) roomIds.splice(index, 1);
  });
};

export const addRoomIdToMDirect = async (
  mx: MatrixClient,
  roomId: string,
  userId: string,
): Promise<void> => {
  const userIdToRoomIds = getMDirectMap(mx);
  removeRoomFromAll(userIdToRoomIds, roomId, userId);
  const roomIds = userIdToRoomIds[userId] ?? [];
  if (!roomIds.includes(roomId)) roomIds.push(roomId);
  userIdToRoomIds[userId] = roomIds;
  await mx.setAccountData(AccountDataEvent.Direct as any, userIdToRoomIds as any);
};

export const removeRoomIdFromMDirect = async (mx: MatrixClient, roomId: string): Promise<void> => {
  const userIdToRoomIds = getMDirectMap(mx);
  removeRoomFromAll(userIdToRoomIds, roomId);
  await mx.setAccountData(AccountDataEvent.Direct as any, userIdToRoomIds as any);
};

export const mxcUrlToHttp = (
  mx: MatrixClient,
  mxcUrl: string,
  useAuthentication?: boolean,
  width?: number,
  height?: number,
  resizeMethod?: string,
  allowDirectLinks?: boolean,
  allowRedirects?: boolean,
): string | null =>
  mx.mxcUrlToHttp(
    mxcUrl,
    width,
    height,
    resizeMethod,
    allowDirectLinks,
    allowRedirects,
    useAuthentication,
  );

export const getThumbnailFallbackUrl = (url: string): string | null => {
  if (!url.includes('/thumbnail')) return null;
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace('/thumbnail', '/download');
    parsed.searchParams.delete('width');
    parsed.searchParams.delete('height');
    parsed.searchParams.delete('method');
    parsed.searchParams.delete('animated');
    return parsed.href;
  } catch {
    return null;
  }
};

const getMediaToken = (mx?: MatrixClient): string | undefined => {
  try {
    return (mx?.getAccessToken() ?? getFallbackSession()?.accessToken) || undefined;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[matrix] access token read failed', err);
    return undefined;
  }
};

const throwMediaError = (res: Response, src: string): never => {
  if (res.status === 404 && import.meta.env.DEV) {
    try {
      console.debug(`[media] not found (404): ${new URL(src).pathname}`);
    } catch {
      console.debug(`[media] not found (404): ${src}`);
    }
  }
  throw new Error(`Failed to fetch media: ${res.status} ${res.statusText}`);
};

export const downloadMedia = async (src: string, mx?: MatrixClient): Promise<Blob> => {
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    const res = await fetch(src);
    if (!res.ok) throwMediaError(res, src);
    return res.blob();
  }
  const token = getMediaToken(mx);
  const res = await fetch(src, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throwMediaError(res, src);
  return res.blob();
};

export const downloadEncryptedMedia = async (
  src: string,
  decryptContent: (buf: ArrayBuffer) => Promise<Blob>,
  mx?: MatrixClient,
): Promise<Blob> => decryptContent(await (await downloadMedia(src, mx)).arrayBuffer());

export const rateLimitedActions = async <T, R = void>(
  data: T[],
  callback: (item: T, index: number) => Promise<R>,
  maxRetryCount?: number,
) => {
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  let actionInterval = 0;

  for (let i = 0; i < data.length; i += 1) {
    let retryCount = 0;
    // eslint-disable-next-line no-await-in-loop
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await callback(data[i], i);
        break;
      } catch (err) {
        const mErr = err as MatrixError;
        if (mErr?.httpStatus !== 429 || retryCount === maxRetryCount) break;
        const waitMS = mErr.getRetryAfterMs?.() ?? 3000;
        actionInterval = waitMS * 1.5;
        // eslint-disable-next-line no-await-in-loop
        await sleep(waitMS);
        retryCount += 1;
      }
    }
    if (actionInterval > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(actionInterval);
    }
  }
};

const roomVersionNumber = (v: string): number => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? Infinity : n;
};
export const knockSupported = (v: string) => roomVersionNumber(v) > 6;
export const restrictedSupported = (v: string) => roomVersionNumber(v) > 7;
export const knockRestrictedSupported = (v: string) => roomVersionNumber(v) > 9;
export const creatorsSupported = (v: string) => roomVersionNumber(v) > 11;
