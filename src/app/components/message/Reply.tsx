import { Box, Icon, Icons, Text, as, color, toRem } from 'folds';
import { EventTimelineSet, Room } from 'matrix-js-sdk';
import React, { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { getMemberAvatarMxc, getMemberDisplayName, trimReplyFromBody } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import { MessageBadEncryptedContent, MessageDeletedContent, MessageFailedContent } from './content';
import { scaleSystemEmoji } from '../../plugins/react-custom-html-parser';
import { useRoomEvent } from '../../hooks/useRoomEvent';
import colorMXID from '../../../util/colorMXID';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useAuthenticatedMxcUrl } from '../../hooks/useAuthenticatedMxcUrl';
import { UserAvatar } from '../user-avatar';

type ReplyLayoutProps = {
  userColor?: string;
  username?: ReactNode;
  avatar?: ReactNode;
  hideBend?: boolean;
};
export const ReplyLayout = as<'div', ReplyLayoutProps>(
  ({ username, userColor, avatar, hideBend, className, children, ...props }, ref) => (
    <Box className={classNames(css.Reply, className)} {...props} ref={ref}>
      {!hideBend && <div className={css.ReplyBend} aria-hidden />}
      {avatar && <div className={css.ReplyAvatar}>{avatar}</div>}
      <Box
        style={{ color: userColor }}
        className={css.ReplyUsername}
        alignItems="Center"
        shrink="No"
      >
        {username}
      </Box>
      <Box grow="Yes" className={css.ReplyContent}>
        {children}
      </Box>
    </Box>
  ),
);

export const ThreadIndicator = as<'div'>(({ ...props }, ref) => (
  <Box
    shrink="No"
    className={css.ThreadIndicator}
    alignItems="Center"
    gap="100"
    {...props}
    ref={ref}
  >
    <Icon size="50" src={Icons.Thread} />
    <Text size="L400">Thread</Text>
  </Box>
));

type ReplyProps = {
  room: Room;
  timelineSet?: EventTimelineSet | undefined;
  replyEventId: string;
  threadRootId?: string | undefined;
  onClick?: MouseEventHandler | undefined;
  getMemberPowerTag?: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
};

export const Reply = as<'div', ReplyProps>(
  (
    {
      room,
      timelineSet,
      replyEventId,
      threadRootId,
      onClick,
      getMemberPowerTag,
      accessibleTagColors,
      legacyUsernameColor,
      ...props
    },
    ref,
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const placeholderWidth = useMemo(() => randomNumberBetween(40, 400), []);
    const getFromLocalTimeline = useCallback(
      () => timelineSet?.findEventById(replyEventId),
      [timelineSet, replyEventId],
    );
    const replyEvent = useRoomEvent(room, replyEventId, getFromLocalTimeline);

    const { body } = replyEvent?.getContent() ?? {};
    const sender = replyEvent?.getSender();
    const powerTag = sender ? getMemberPowerTag?.(sender) : undefined;
    const tagColor = powerTag?.color ? accessibleTagColors?.get(powerTag.color) : undefined;

    const usernameColor = legacyUsernameColor ? colorMXID(sender ?? replyEventId) : tagColor;

    const avatarMxc = sender ? getMemberAvatarMxc(room, sender) : undefined;
    const directUrl = avatarMxc
      ? (mxcUrlToHttp(mx, avatarMxc, useAuthentication, 32, 32, 'crop') ?? undefined)
      : undefined;
    const authUrl = useAuthenticatedMxcUrl(avatarMxc, 32, 32, 'crop');
    const avatarUrl = useAuthentication ? authUrl : directUrl;

    const displayName = sender
      ? (getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender)
      : undefined;

    const fallbackBody = replyEvent?.isRedacted() ? (
      <MessageDeletedContent />
    ) : (
      <MessageFailedContent />
    );

    const badEncryption = replyEvent?.getContent().msgtype === 'm.bad.encrypted';
    const bodyJSX = body ? scaleSystemEmoji(trimReplyFromBody(body)) : fallbackBody;

    return (
      <Box direction="Row" gap="200" alignItems="Center" {...props} ref={ref}>
        {threadRootId && (
          <ThreadIndicator as="button" data-event-id={threadRootId} onClick={onClick} />
        )}
        <ReplyLayout
          as="button"
          userColor={usernameColor}
          username={
            sender && displayName ? (
              <Text size="T300" truncate>
                <b>@{displayName}</b>
              </Text>
            ) : undefined
          }
          avatar={
            sender ? (
              <UserAvatar
                userId={sender}
                src={avatarUrl}
                alt={displayName ?? sender}
                renderFallback={() => <Icon size="50" src={Icons.User} filled />}
              />
            ) : undefined
          }
          data-event-id={replyEventId}
          onClick={onClick}
        >
          {replyEvent !== undefined ? (
            <Text size="T300" truncate>
              {badEncryption ? <MessageBadEncryptedContent /> : bodyJSX}
            </Text>
          ) : (
            <LinePlaceholder
              style={{
                backgroundColor: color.SurfaceVariant.ContainerActive,
                width: toRem(placeholderWidth),
                maxWidth: '100%',
              }}
            />
          )}
        </ReplyLayout>
      </Box>
    );
  },
);
