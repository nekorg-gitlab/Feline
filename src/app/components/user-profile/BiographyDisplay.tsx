import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Text,
  config,
  Icon,
  Icons,
  IconButton,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Header,
  Avatar,
} from 'folds';
import parse from 'html-react-parser';
import FocusTrap from 'focus-trap-react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { getReactCustomHtmlParser, LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { UserAvatar } from '../user-avatar';
import { stopPropagation } from '../../utils/keyboard';
import { getMxIdLocalPart } from '../../utils/matrix';
import { BreakWord } from '../../styles/Text.css';

type BiographyDisplayProps = {
  bio: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
};

export function BiographyDisplay({ bio, userId, displayName, avatarUrl }: BiographyDisplayProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSpoilerClick = useSpoilerClickHandler();

  const htmlParserOpts = useMemo(
    () =>
      getReactCustomHtmlParser(mx, undefined, {
        linkifyOpts: LINKIFY_OPTS,
        handleSpoilerClick,
      }),
    [mx, handleSpoilerClick],
  );

  const sanitized = useMemo(() => sanitizeCustomHtml(bio), [bio]);

  const checkOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsOverflow(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useLayoutEffect(() => {
    checkOverflow();
  }, [bio, checkOverflow]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkOverflow]);

  if (!bio) return null;

  const username = userId ? getMxIdLocalPart(userId) : undefined;

  return (
    <>
      <Box direction="Column" gap="200">
        <Box
          ref={containerRef}
          direction="Column"
          style={{
            maxHeight: '6em',
            overflow: 'hidden',
            position: 'relative',
            lineHeight: '1.5em',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          <Text size="T300" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {parse(sanitized, htmlParserOpts)}
          </Text>
          {isOverflow && (
            <Box
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: config.space.S600,
                background: `linear-gradient(transparent, var(--folds-color-SurfaceVariant-Container) 90%)`,
                pointerEvents: 'none',
              }}
            />
          )}
        </Box>
        {isOverflow && (
          <Box>
            <Button
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              onClick={() => setOpen(true)}
            >
              <Text size="B300">{t('Common.showMore')}</Text>
            </Button>
          </Box>
        )}
      </Box>

      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setOpen(false),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal
              variant="Surface"
              size="500"
              style={{
                width: 'min(640px, 90vw)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Header
                variant="Surface"
                size="500"
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                  flexShrink: 0,
                }}
              >
                <Box grow="Yes" alignItems="Center" gap="200">
                  <Text size="H4" truncate>
                    {displayName ?? username ?? t('Common.biography')}
                  </Text>
                </Box>
                <IconButton size="300" radii="300" onClick={() => setOpen(false)}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>

              <Box
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Scroll variant="Surface" visibility="Hover" hideTrack>
                  <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                    {userId && (
                      <Box
                        direction="Column"
                        gap="300"
                        alignItems="Center"
                        style={{ textAlign: 'center' }}
                      >
                        <Avatar size="500" radii="400" style={{ width: '96px', height: '96px' }}>
                          <UserAvatar
                            userId={userId}
                            src={avatarUrl}
                            alt={userId}
                            renderFallback={() => <Icon size="500" src={Icons.User} filled />}
                          />
                        </Avatar>
                        <Box direction="Column" gap="100" alignItems="Center">
                          <Text
                            size="H3"
                            className={classNames(BreakWord)}
                            style={{ textAlign: 'center' }}
                          >
                            {displayName ?? username ?? userId}
                          </Text>
                          {username && (
                            <Text
                              size="T200"
                              priority="300"
                              className={classNames(BreakWord)}
                              style={{ textAlign: 'center' }}
                            >
                              @{username}
                            </Text>
                          )}
                        </Box>
                      </Box>
                    )}
                    <Box direction="Column" gap="200">
                      {!userId && <Text size="L400">{t('Common.biography')}</Text>}
                      <Text
                        size="T300"
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {parse(sanitized, htmlParserOpts)}
                      </Text>
                    </Box>
                  </Box>
                </Scroll>
              </Box>
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    </>
  );
}
