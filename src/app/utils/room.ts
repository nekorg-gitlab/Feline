import { IconName, IconSrc } from 'folds';

import {
  EventTimeline,
  EventTimelineSet,
  EventType,
  IMentions,
  IPowerLevelsContent,
  IPushRule,
  IPushRules,
  JoinRule,
  MatrixClient,
  MatrixEvent,
  MsgType,
  NotificationCountType,
  RelationType,
  Room,
  RoomMember,
  RoomNameState,
  RoomNameType,
} from 'matrix-js-sdk';
import { CryptoBackend } from 'matrix-js-sdk/lib/common-crypto/CryptoBackend';
import { AccountDataEvent } from '../../types/matrix/accountData';
import {
  IRoomCreateContent,
  Membership,
  MessageEvent,
  NotificationType,
  RoomToParents,
  RoomType,
  StateEvent,
  UnreadInfo,
} from '../../types/matrix/room';

const getRoomState = (room: Room) => room.getLiveTimeline().getState(EventTimeline.FORWARDS);

export const getStateEvent = (
  room: Room,
  eventType: StateEvent,
  stateKey = '',
): MatrixEvent | undefined => getRoomState(room)?.getStateEvents(eventType, stateKey) ?? undefined;

export const getStateEvents = (room: Room, eventType: StateEvent): MatrixEvent[] =>
  getRoomState(room)?.getStateEvents(eventType) ?? [];

export const getAccountData = (
  mx: MatrixClient,
  eventType: AccountDataEvent,
): MatrixEvent | undefined => mx.getAccountData(eventType as any);

export const getMDirects = (mDirectEvent: MatrixEvent): Set<string> => {
  const userIdToDirects = mDirectEvent?.getContent() ?? {};
  return new Set(
    Object.values(userIdToDirects).flatMap((directs: unknown) =>
      Array.isArray(directs) ? directs.filter((id): id is string => typeof id === 'string') : [],
    ),
  );
};

export const isDirectInvite = (room: Room | null, myUserId: string | null): boolean =>
  !!room &&
  !!myUserId &&
  room.getMember(myUserId)?.events?.member?.getContent()?.is_direct === true;

export const getDirectUserId = (mx: MatrixClient, roomId: string): string | undefined => {
  const userIdToDirects = getAccountData(mx, AccountDataEvent.Direct)?.getContent<
    Record<string, string[]>
  >();
  if (userIdToDirects && typeof userIdToDirects === 'object') {
    for (const [userId, directs] of Object.entries(userIdToDirects)) {
      if (Array.isArray(directs) && directs.includes(roomId)) return userId;
    }
  }
  const room = mx.getRoom(roomId);
  if (room && (isDirectInvite(room, mx.getUserId()) || room.getMyMembership() === 'invite')) {
    return room.getDMInviter() ?? undefined;
  }
  return undefined;
};

export const getDirectUserName = (
  mx: MatrixClient,
  roomId: string,
  dmUserId: string,
  oldName?: string,
): string => {
  const member = mx.getRoom(roomId)?.getMember(dmUserId);
  if (member?.name && member.name !== dmUserId) return member.name;
  const user = mx.getUser(dmUserId);
  return user?.displayName ?? user?.rawDisplayName ?? oldName ?? member?.name ?? dmUserId;
};

export const createRoomNameGenerator = (mx: MatrixClient) => {
  return (roomId: string, state: RoomNameState): string | null => {
    if (state.type === RoomNameType.Actual) return state.name;
    const dmUserId = getDirectUserId(mx, roomId);
    if (!dmUserId) return null;
    const name = getDirectUserName(
      mx,
      roomId,
      dmUserId,
      state.type === RoomNameType.EmptyRoom ? state.oldName : undefined,
    );
    return state.type === RoomNameType.Generated && state.subtype === 'Inviting'
      ? `Inviting ${name}`
      : name;
  };
};

const getCreateType = (room: Room | null): string | undefined =>
  room ? getStateEvent(room, StateEvent.RoomCreate)?.getContent().type : undefined;

export const isSpace = (room: Room | null): boolean =>
  !!room && getCreateType(room) === RoomType.Space;

export const isRoom = (room: Room | null): boolean => {
  if (!room) return false;
  return getCreateType(room) !== RoomType.Space;
};

export const isUnsupportedRoom = (room: Room | null): boolean => {
  if (!room) return false;
  if (!getStateEvent(room, StateEvent.RoomCreate)) return true;
  return getCreateType(room) !== RoomType.Space;
};

export function isValidChild(mEvent: MatrixEvent): boolean {
  return (
    mEvent.getType() === StateEvent.SpaceChild &&
    Array.isArray(mEvent.getContent<{ via: string[] }>().via)
  );
}

export const getAllParents = (roomToParents: RoomToParents, roomId: string): Set<string> => {
  const allParents = new Set<string>();

  const addAllParentIds = (rId: string) => {
    if (allParents.has(rId)) return;
    allParents.add(rId);

    const parents = roomToParents.get(rId);
    parents?.forEach((id) => addAllParentIds(id));
  };
  addAllParentIds(roomId);
  allParents.delete(roomId);
  return allParents;
};

export const getSpaceChildren = (room: Room): string[] =>
  getStateEvents(room, StateEvent.SpaceChild)
    .filter((mEvent) => isValidChild(mEvent) && mEvent.getStateKey())
    .map((mEvent) => mEvent.getStateKey()!);

export const mapParentWithChildren = (
  roomToParents: RoomToParents,
  roomId: string,
  children: string[],
) => {
  const allParents = getAllParents(roomToParents, roomId);
  children.forEach((childId) => {
    if (allParents.has(childId)) return;
    const parents = roomToParents.get(childId) ?? new Set<string>();
    parents.add(roomId);
    roomToParents.set(childId, parents);
  });
};

export const getRoomToParents = (mx: MatrixClient): RoomToParents => {
  const map: RoomToParents = new Map();
  mx.getRooms()
    .filter((room) => isSpace(room))
    .forEach((room) => mapParentWithChildren(map, room.roomId, getSpaceChildren(room)));

  return map;
};

export const getOrphanParents = (roomToParents: RoomToParents, roomId: string): string[] => {
  const parents = getAllParents(roomToParents, roomId);
  const orphanParents = Array.from(parents).filter(
    (parentRoomId) => !roomToParents.has(parentRoomId),
  );

  return orphanParents;
};

export const isMutedRule = (rule: IPushRule) =>
  (rule.actions.length === 0 || rule.actions[0] === 'dont_notify') &&
  rule.conditions?.[0]?.kind === 'event_match';

export const findMutedRule = (overrideRules: IPushRule[], roomId: string) =>
  overrideRules.find((rule) => rule.rule_id === roomId && isMutedRule(rule));

export const getNotificationType = (mx: MatrixClient, roomId: string): NotificationType => {
  let roomPushRule: IPushRule | undefined;
  try {
    roomPushRule = mx.getRoomPushRule('global', roomId);
  } catch (err) {
    if (import.meta.env.DEV) console.debug('[room] getRoomPushRule failed', err);
    roomPushRule = undefined;
  }

  if (!roomPushRule) {
    const overrideRules = mx.getAccountData(EventType.PushRules)?.getContent<IPushRules>()
      ?.global?.override;
    if (!overrideRules) return NotificationType.Default;

    return findMutedRule(overrideRules, roomId) ? NotificationType.Mute : NotificationType.Default;
  }

  if (roomPushRule.actions[0] === 'notify') return NotificationType.AllMessages;
  return NotificationType.MentionsAndKeywords;
};

const NOTIFICATION_EVENT_TYPES = [
  'm.room.create',
  'm.room.message',
  'm.room.encrypted',
  'm.room.member',
  'm.sticker',
];
export const isNotificationEvent = (mEvent: MatrixEvent) => {
  const eType = mEvent.getType();
  if (!NOTIFICATION_EVENT_TYPES.includes(eType) || eType === 'm.room.member') return false;
  return !mEvent.isRedacted() && mEvent.getRelation()?.rel_type !== 'm.replace';
};

export const roomHaveNotification = (room: Room): boolean =>
  room.getUnreadNotificationCount(NotificationCountType.Total) > 0 ||
  room.getUnreadNotificationCount(NotificationCountType.Highlight) > 0;

export const roomHaveUnread = (mx: MatrixClient, room: Room) => {
  const userId = mx.getUserId();
  if (!userId) return false;
  const readUpToId = room.getEventReadUpTo(userId);
  const liveEvents = room.getLiveTimeline().getEvents();

  if (liveEvents[liveEvents.length - 1]?.getSender() === userId) {
    return false;
  }

  for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
    const event = liveEvents[i];
    if (!event) return false;
    if (event.getId() === readUpToId) return false;
    if (isNotificationEvent(event)) return true;
  }
  return true;
};

export const getUnreadInfo = (room: Room): UnreadInfo => {
  const total = room.getUnreadNotificationCount(NotificationCountType.Total);
  const highlight = room.getUnreadNotificationCount(NotificationCountType.Highlight);
  return { roomId: room.roomId, highlight, total: Math.max(highlight, total) };
};

export const getUnreadInfos = (mx: MatrixClient): UnreadInfo[] =>
  mx
    .getRooms()
    .filter(
      (room) =>
        !room.isSpaceRoom() &&
        room.getMyMembership() === 'join' &&
        getNotificationType(mx, room.roomId) !== NotificationType.Mute &&
        (roomHaveNotification(room) || roomHaveUnread(mx, room)),
    )
    .map(getUnreadInfo);

export const getRoomIconSrc = (
  icons: Record<IconName, IconSrc>,
  roomType?: string,
  joinRule?: JoinRule,
): IconSrc => {
  const locked =
    joinRule === JoinRule.Invite || joinRule === JoinRule.Knock || joinRule === JoinRule.Private;
  if (roomType === RoomType.Space) {
    if (joinRule === JoinRule.Public) return icons.SpaceGlobe;
    return locked ? icons.SpaceLock : icons.Space;
  }
  if (roomType === RoomType.Call) {
    if (joinRule === JoinRule.Public) return icons.VolumeHighGlobe;
    return locked ? icons.VolumeHighLock : icons.VolumeHigh;
  }
  if (joinRule === JoinRule.Public) return icons.HashGlobe;
  return locked ? icons.HashLock : icons.Hash;
};

export const getRoomAvatarUrl = (
  mx: MatrixClient,
  room: Room,
  size: 32 | 96 = 32,
  useAuthentication = false,
): string | undefined => {
  const mxcUrl = room.getMxcAvatarUrl();
  return mxcUrl
    ? (mx.mxcUrlToHttp(mxcUrl, size, size, 'crop', undefined, false, useAuthentication) ??
        undefined)
    : undefined;
};

export const getDirectAvatarMxc = (mx: MatrixClient, roomId: string): string | undefined => {
  const room = mx.getRoom(roomId);
  const dmUserId = getDirectUserId(mx, roomId);
  return (
    room?.getAvatarFallbackMember()?.getMxcAvatarUrl() ??
    (dmUserId
      ? (room?.getMember(dmUserId)?.getMxcAvatarUrl() ??
        mx.getUser(dmUserId)?.avatarUrl ??
        undefined)
      : undefined)
  );
};

export const getDirectRoomAvatarUrl = (
  mx: MatrixClient,
  room: Room,
  size: 32 | 96 = 32,
  useAuthentication = false,
): string | undefined => {
  const mxcUrl = getDirectAvatarMxc(mx, room.roomId);

  if (!mxcUrl) {
    return getRoomAvatarUrl(mx, room, size, useAuthentication);
  }

  return (
    mx.mxcUrlToHttp(mxcUrl, size, size, 'crop', undefined, false, useAuthentication) ?? undefined
  );
};

export const trimReplyFromBody = (body: string): string => {
  const match = body.match(/^> <.+?> .+\n(>.*\n)*?\n/m);
  if (!match) return body;
  return body.slice(match[0].length);
};

export const trimReplyFromFormattedBody = (formattedBody: string): string => {
  const suffix = '</mx-reply>';
  const i = formattedBody.lastIndexOf(suffix);
  if (i < 0) {
    return formattedBody;
  }
  return formattedBody.slice(i + suffix.length);
};

export const parseReplyBody = (userId: string, body: string) =>
  `> <${userId}> ${body.replace(/\n/g, '\n> ')}\n\n`;

export const parseReplyFormattedBody = (
  roomId: string,
  userId: string,
  eventId: string,
  formattedBody: string,
): string => {
  const replyToLink = `<a href="https://matrix.to/#/${encodeURIComponent(
    roomId,
  )}/${encodeURIComponent(eventId)}">In reply to</a>`;
  const userLink = `<a href="https://matrix.to/#/${encodeURIComponent(userId)}">${userId}</a>`;

  return `<mx-reply><blockquote>${replyToLink}${userLink}<br />${formattedBody}</blockquote></mx-reply>`;
};

export const getMemberDisplayName = (room: Room, userId: string): string | undefined => {
  const name = room.getMember(userId)?.rawDisplayName;
  return name === userId ? undefined : name;
};

export const getMemberSearchStr = (
  member: RoomMember,
  query: string,
  mxIdToName: (mxId: string) => string,
): string[] => [
  member.rawDisplayName === member.userId ? mxIdToName(member.userId) : member.rawDisplayName,
  query.startsWith('@') || query.indexOf(':') > -1 ? member.userId : mxIdToName(member.userId),
];

export const getMemberAvatarMxc = (room: Room, userId: string): string | undefined =>
  room.getMember(userId)?.getMxcAvatarUrl();

export const isMembershipChanged = (mEvent: MatrixEvent): boolean =>
  mEvent.getContent().membership !== mEvent.getPrevContent().membership ||
  mEvent.getContent().reason !== mEvent.getPrevContent().reason;

export const decryptAllTimelineEvent = async (mx: MatrixClient, timeline: EventTimeline) => {
  const crypto = mx.getCrypto();
  if (!crypto) return;
  await Promise.allSettled(
    timeline
      .getEvents()
      .filter((event) => event.isEncrypted())
      .reverse()
      .map((event) => event.attemptDecryption(crypto as CryptoBackend, { isRetry: true })),
  );
};

export const getReactionContent = (eventId: string, key: string, shortcode?: string) => ({
  'm.relates_to': {
    event_id: eventId,
    key,
    rel_type: 'm.annotation',
  },
  shortcode,
});

export const getEventReactions = (timelineSet: EventTimelineSet, eventId: string) =>
  timelineSet.relations.getChildEventsForEvent(
    eventId,
    RelationType.Annotation,
    EventType.Reaction,
  );

export const getEventEdits = (timelineSet: EventTimelineSet, eventId: string, eventType: string) =>
  timelineSet.relations.getChildEventsForEvent(eventId, RelationType.Replace, eventType);

export const getLatestEdit = (
  targetEvent: MatrixEvent,
  editEvents: MatrixEvent[],
): MatrixEvent | undefined =>
  editEvents
    .sort((m1, m2) => m2.getTs() - m1.getTs())
    .find((rEvent) => rEvent.getSender() === targetEvent.getSender());

export const getEditedEvent = (
  mEventId: string,
  mEvent: MatrixEvent,
  timelineSet: EventTimelineSet,
): MatrixEvent | undefined => {
  const edits = getEventEdits(timelineSet, mEventId, mEvent.getType());
  return edits && getLatestEdit(mEvent, edits.getRelations());
};

export const canEditEvent = (mx: MatrixClient, mEvent: MatrixEvent) => {
  const content = mEvent.getContent();
  const relationType = content['m.relates_to']?.rel_type;
  return (
    mEvent.getSender() === mx.getUserId() &&
    (!relationType || relationType === RelationType.Thread) &&
    mEvent.getType() === MessageEvent.RoomMessage &&
    (content.msgtype === MsgType.Text ||
      content.msgtype === MsgType.Emote ||
      content.msgtype === MsgType.Notice)
  );
};

export const getLatestEditableEvt = (
  timeline: EventTimeline,
  canEdit: (mEvent: MatrixEvent) => boolean,
): MatrixEvent | undefined => {
  const events = timeline.getEvents();
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (canEdit(events[i])) return events[i];
  }
  return undefined;
};

export const reactionOrEditEvent = (mEvent: MatrixEvent) =>
  mEvent.getRelation()?.rel_type === RelationType.Annotation ||
  mEvent.getRelation()?.rel_type === RelationType.Replace;

export const getMentionContent = (userIds: string[], room: boolean): IMentions => ({
  ...(userIds.length > 0 ? { user_ids: userIds } : {}),
  ...(room ? { room: true as const } : {}),
});

export const getCommonRooms = (mx: MatrixClient, rooms: string[], otherUserId: string): string[] =>
  rooms.filter((roomId) => {
    const room = mx.getRoom(roomId);
    return (
      !!room &&
      room.getMyMembership() === Membership.Join &&
      room.hasMembershipState(otherUserId, Membership.Join)
    );
  });

export const bannedInRooms = (mx: MatrixClient, rooms: string[], otherUserId: string): boolean =>
  rooms.some((roomId) => {
    const room = mx.getRoom(roomId);
    return (
      !!room &&
      room.getMyMembership() === Membership.Join &&
      room.hasMembershipState(otherUserId, Membership.Ban)
    );
  });

export const getAllVersionsRoomCreator = (room: Room): Set<string> => {
  const createEvent = getStateEvent(room, StateEvent.RoomCreate);
  const createContent = createEvent?.getContent<IRoomCreateContent>();
  const creator = createEvent?.getSender();
  return new Set(
    [
      creator,
      ...(Array.isArray(createContent?.additional_creators)
        ? createContent.additional_creators
        : []),
    ].filter((c): c is string => typeof c === 'string'),
  );
};

export const guessPerfectParent = (
  mx: MatrixClient,
  roomId: string,
  parents: string[],
): string | undefined => {
  if (parents.length === 1) return parents[0];

  const getSpecialUsers = (rId: string): Set<string> => {
    const r = mx.getRoom(rId);
    if (!r) return new Set();
    const specialUsers = getAllVersionsRoomCreator(r);
    const powerLevels = getStateEvent(
      r,
      StateEvent.RoomPowerLevels,
    )?.getContent<IPowerLevelsContent>();
    const defaultPower =
      typeof powerLevels?.users_default === 'number' ? powerLevels.users_default : 0;
    if (typeof powerLevels?.users === 'object') {
      Object.entries(powerLevels.users).forEach(([userId, power]) => {
        if (power > defaultPower) specialUsers.add(userId);
      });
    }
    return specialUsers;
  };

  const roomSpecialUsers = getSpecialUsers(roomId);
  let perfectParent: string | undefined;
  let score = 0;
  parents.forEach((parentId) => {
    const matched = [...getSpecialUsers(parentId)].filter((userId) =>
      roomSpecialUsers.has(userId),
    ).length;
    if (matched > score) {
      score = matched;
      perfectParent = parentId;
    }
  });
  return perfectParent;
};
