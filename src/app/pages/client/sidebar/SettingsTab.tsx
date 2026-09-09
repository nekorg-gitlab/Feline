import React, { MouseEventHandler, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Spinner,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useAuthenticatedMxcUrl } from '../../../hooks/useAuthenticatedMxcUrl';
import { Settings, SettingsPages } from '../../../features/settings';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { BiographyDisplay } from '../../../components/user-profile/BiographyDisplay';
import { Modal500 } from '../../../components/Modal500';
import {
  Session,
  getActiveSessionId,
  getSessions,
  setAddingAccount,
  updateSessionProfile,
} from '../../../state/sessions';
import { logoutSpecificSession, switchActiveSession } from '../../../../client/initMatrix';
import { copyToClipboard } from '../../../utils/dom';
import { getLoginPath } from '../../pathUtils';

function AccountRow({
  session,
  active,
  avatarUrl,
  signingOut,
  onSwitch,
  onSignOut,
}: {
  session: Session;
  active: boolean;
  avatarUrl?: string;
  signingOut: boolean;
  onSwitch: () => void;
  onSignOut: () => void;
}) {
  const displayName = session.displayName ?? getMxIdLocalPart(session.userId) ?? session.userId;
  return (
    <Box
      onClick={onSwitch}
      onKeyDown={(evt) => {
        if (!active && (evt.key === 'Enter' || evt.key === ' ')) {
          evt.preventDefault();
          onSwitch();
        }
      }}
      tabIndex={active ? undefined : 0}
      role={active ? undefined : 'button'}
      alignItems="Center"
      gap="200"
      style={{
        width: '100%',
        padding: `${config.space.S100} ${config.space.S200}`,
        borderRadius: config.radii.R300,
        cursor: active ? 'default' : 'pointer',
        backgroundColor: active ? color.SurfaceVariant.Container : 'transparent',
      }}
      onMouseEnter={(evt) => {
        if (!active) evt.currentTarget.style.backgroundColor = color.SurfaceVariant.Container;
      }}
      onMouseLeave={(evt) => {
        if (!active) evt.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Avatar size="300" radii="400">
        <UserAvatar
          userId={session.userId}
          src={active ? avatarUrl : undefined}
          renderFallback={() => <Text size="H6">{nameInitials(displayName)}</Text>}
        />
      </Avatar>
      <Box grow="Yes" direction="Column" gap="0" alignItems="Start">
        <Text size="T300" truncate>
          <b>{displayName}</b>
        </Text>
        <Text size="T200" priority="300" truncate>
          {session.userId}
        </Text>
      </Box>
      {active && <Icon size="100" src={Icons.Check} style={{ color: color.Success.Main }} />}
      <IconButton
        size="300"
        variant="Critical"
        fill="None"
        radii="300"
        aria-label={`Sign out ${session.userId}`}
        title={`Sign out ${session.userId}`}
        disabled={signingOut}
        onClick={(evt) => {
          evt.stopPropagation();
          onSignOut();
        }}
      >
        {signingOut ? (
          <Spinner size="100" variant="Critical" fill="Solid" />
        ) : (
          <Icon size="100" src={Icons.ArrowGoRightCross} />
        )}
      </IconButton>
    </Box>
  );
}

export function SettingsTab() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId()!;
  const profile = useUserProfile(userId);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SettingsPages | undefined>(undefined);
  const [profileAnchor, setProfileAnchor] = useState<RectCords>();
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  const [flyoutPos, setFlyoutPos] = useState<{ left: number; top: number; rowCenter: number }>();
  const [flyoutSide, setFlyoutSide] = useState(true);
  const [switchHover, setSwitchHover] = useState(false);
  const [flyoutHover, setFlyoutHover] = useState(false);
  const [switchPinned, setSwitchPinned] = useState(false);
  const [signingOutId, setSigningOutId] = useState<string>();
  const [copied, setCopied] = useState(false);
  const switchCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Touch screens emulate (sticky) hover on tap, which fights the tap toggle.
  // Only honor hover on devices with a real fine pointer; touch uses tap.
  const [canHover] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  );

  const avatarBtnRef = useRef<HTMLElement | null>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const flyoutMenuRef = useRef<HTMLDivElement>(null);
  const switchRowRef = useRef<HTMLButtonElement | null>(null);

  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const directAvatarUrl = profile.avatarUrl
    ? (mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const authAvatarUrl = useAuthenticatedMxcUrl(profile.avatarUrl, 96, 96, 'crop');
  const avatarUrl = useAuthentication ? authAvatarUrl : directAvatarUrl;

  useEffect(() => {
    updateSessionProfile(userId, {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
    setSessions(getSessions());
  }, [userId, profile.displayName, profile.avatarUrl]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const closeProfile = () => {
    if (switchCloseTimer.current) {
      clearTimeout(switchCloseTimer.current);
      switchCloseTimer.current = undefined;
    }
    setProfileAnchor(undefined);
    setFlyoutPos(undefined);
    setSwitchHover(false);
    setFlyoutHover(false);
    setSwitchPinned(false);
  };

  useEffect(
    () => () => {
      if (switchCloseTimer.current) clearTimeout(switchCloseTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!profileAnchor) return undefined;
    const handlePointerDown = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;
      if (avatarBtnRef.current?.contains(target)) return;
      if (mainMenuRef.current?.contains(target)) return;
      if (flyoutMenuRef.current?.contains(target)) return;
      closeProfile();
    };
    const handleKey = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') closeProfile();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [profileAnchor]);

  const openSettings = (page?: SettingsPages) => {
    setSettingsPage(page);
    setSettingsOpen(true);
    closeProfile();
  };

  const handleAvatarClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    evt.preventDefault();
    const rect = evt.currentTarget.getBoundingClientRect();
    setSessions(getSessions());
    setProfileAnchor((current) => {
      if (current) return undefined;
      return rect;
    });
    setFlyoutPos(undefined);
    setSwitchHover(false);
    setFlyoutHover(false);
    setSwitchPinned(false);
  };

  const handleEditProfile = () => openSettings(SettingsPages.AccountPage);
  const handleOpenSettings = () => openSettings(SettingsPages.GeneralPage);
  const handleCopyId = () => {
    copyToClipboard(userId);
    setCopied(true);
  };

  const FLYOUT_WIDTH = 300;
  const FLYOUT_GAP = 8;

  const placeFlyout = (rowEl: HTMLElement) => {
    // Anchor horizontally to the visible popover card (not just the row) so
    // the panel always lands to the right of the profile, never on top of it.
    const menuRect = mainMenuRef.current?.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();
    const cardRight = menuRect && menuRect.width > 0 ? menuRect.right : rowRect.right;
    const fitsRight = cardRight + FLYOUT_GAP + FLYOUT_WIDTH <= window.innerWidth - FLYOUT_GAP;
    setFlyoutSide(fitsRight);
    if (!fitsRight) {
      setFlyoutPos(undefined);
      return;
    }
    // Center on the row; if the panel is already mounted, position it
    // exactly. On first open the layout effect below does this once mounted.
    const rowCenter = (rowRect.top + rowRect.bottom) / 2;
    const centerClamped = (height: number) =>
      Math.min(
        Math.max(FLYOUT_GAP, rowCenter - height / 2),
        Math.max(FLYOUT_GAP, window.innerHeight - FLYOUT_GAP - height),
      );
    const mountedHeight = flyoutMenuRef.current?.getBoundingClientRect().height ?? 0;
    const next = {
      left: cardRight + FLYOUT_GAP,
      top: mountedHeight > 0 ? centerClamped(mountedHeight) : Math.max(FLYOUT_GAP, rowRect.top),
      rowCenter,
    };
    setFlyoutPos((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.rowCenter === next.rowCenter
        ? prev
        : next,
    );
  };

  const switchOpen = !!profileAnchor && (switchHover || flyoutHover || switchPinned);

  // Keep the flyout glued to the row if the layout shifts while open,
  // and re-evaluate side vs. inline on resize.
  useEffect(() => {
    if (!switchOpen) return undefined;
    const onReposition = () => {
      if (switchRowRef.current) placeFlyout(switchRowRef.current);
    };
    window.addEventListener('resize', onReposition);
    document.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      document.removeEventListener('scroll', onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchOpen]);
  const cancelSwitchClose = () => {
    if (switchCloseTimer.current) {
      clearTimeout(switchCloseTimer.current);
      switchCloseTimer.current = undefined;
    }
  };

  const scheduleSwitchClose = () => {
    cancelSwitchClose();
    // Small delay so moving the cursor from the row to the flyout
    // (across the offset gap) doesn't instantly close it and cause flicker.
    switchCloseTimer.current = setTimeout(() => {
      setSwitchHover(false);
      setFlyoutHover(false);
    }, 200);
  };

  const handleSwitchEnter: MouseEventHandler<HTMLButtonElement> = (evt) => {
    if (!canHover) return;
    cancelSwitchClose();
    placeFlyout(evt.currentTarget);
    setSwitchHover(true);
  };
  const handleSwitchLeave = () => {
    if (!canHover) return;
    if (switchPinned) {
      setSwitchHover(false);
      return;
    }
    scheduleSwitchClose();
  };
  const handleSwitchClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    cancelSwitchClose();
    placeFlyout(evt.currentTarget);
    setSwitchPinned((v) => !v);
  };
  const handleFlyoutEnter = () => {
    if (!canHover) return;
    cancelSwitchClose();
    setFlyoutHover(true);
  };
  const handleFlyoutLeave = () => {
    if (!canHover) return;
    if (switchPinned) {
      setFlyoutHover(false);
      return;
    }
    scheduleSwitchClose();
  };

  const showSideFlyout = switchOpen && flyoutSide && !!flyoutPos;
  const showInlineAccounts = switchOpen && !flyoutSide;

  // After the panel mounts, center it on the row, clamped to the viewport.
  useLayoutEffect(() => {
    if (!showSideFlyout || !flyoutPos) return;
    const el = flyoutMenuRef.current;
    if (!el) return;
    const height = el.getBoundingClientRect().height;
    const centered = Math.min(
      Math.max(FLYOUT_GAP, flyoutPos.rowCenter - height / 2),
      Math.max(FLYOUT_GAP, window.innerHeight - FLYOUT_GAP - height),
    );
    if (centered !== flyoutPos.top) {
      setFlyoutPos((pos) => (pos ? { ...pos, top: centered } : pos));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSideFlyout, flyoutPos?.top, flyoutPos?.left, sessions.length]);
  const activeSessionId = getActiveSessionId() ?? userId;

  const handleSwitchAccount = (targetId: string) => {
    if (targetId === activeSessionId) return;
    switchActiveSession(targetId);
  };

  const handleSignOut = async (targetId: string) => {
    if (signingOutId) return;
    setSigningOutId(targetId);
    try {
      const isActive = targetId === activeSessionId;
      await logoutSpecificSession(targetId, isActive ? mx : undefined);
      if (!isActive) {
        setSessions(getSessions());
      }
    } finally {
      setSigningOutId(undefined);
    }
  };

  const handleAddAccount = () => {
    setAddingAccount(true);
    closeProfile();
    navigate(getLoginPath());
  };

  const renderAccountsList = (compact?: boolean) => (
    <Box
      direction="Column"
      gap="100"
      style={{ padding: compact ? config.space.S100 : config.space.S200 }}
    >
      <Text size="L400" priority="300" style={{ padding: `0 ${config.space.S200}` }}>
        Accounts ({sessions.length})
      </Text>
      {sessions.map((s) => (
        <AccountRow
          key={s.userId}
          session={s}
          active={s.userId === activeSessionId}
          avatarUrl={s.userId === activeSessionId ? avatarUrl : undefined}
          signingOut={signingOutId === s.userId}
          onSwitch={() => handleSwitchAccount(s.userId)}
          onSignOut={() => handleSignOut(s.userId)}
        />
      ))}
      <Line variant="Surface" size="300" />
      <Button
        variant="Secondary"
        fill="Soft"
        size="300"
        radii="300"
        outlined
        before={<Icon size="100" src={Icons.Plus} />}
        onClick={handleAddAccount}
      >
        <Text as="span" size="B300">
          Add Account
        </Text>
      </Button>
    </Box>
  );

  return (
    <SidebarItem active={settingsOpen || !!profileAnchor}>
      <SidebarItemTooltip tooltip="You">
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            data-testid="settings-bottom-left"
            ref={(el: HTMLElement | null) => {
              (triggerRef as (e: HTMLElement | null) => void)(el);
              avatarBtnRef.current = el;
            }}
            onClick={handleAvatarClick}
          >
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
            />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>

      {profileAnchor && (
        <PopOut
          anchor={profileAnchor}
          position="Right"
          align="End"
          offset={12}
          content={
            <div ref={mainMenuRef}>
              <Menu
                style={{
                  width: toRem(340),
                  maxWidth: 'calc(100vw - 96px)',
                  padding: 0,
                  overflowY: 'auto',
                  maxHeight: 'min(82vh, 640px)',
                }}
              >
                <Box direction="Column">
                  <Box direction="Column" gap="200" style={{ padding: config.space.S400 }}>
                    <Box gap="300" alignItems="Center">
                      <Avatar
                        size="500"
                        radii="400"
                        style={{ boxShadow: `0 0 0 4px ${color.Surface.Container}` }}
                      >
                        <UserAvatar
                          userId={userId}
                          src={avatarUrl}
                          renderFallback={() => <Text size="H2">{nameInitials(displayName)}</Text>}
                        />
                      </Avatar>
                    </Box>
                    <Box direction="Column" gap="100">
                      <Text size="H4" truncate>
                        {displayName}
                      </Text>
                      <Text size="T300" priority="300" truncate>
                        {userId}
                      </Text>
                      {profile.bio && (
                        <Box
                          direction="Column"
                          gap="100"
                          style={{
                            padding: `${config.space.S200} ${config.space.S300}`,
                            backgroundColor: color.SurfaceVariant.Container,
                            borderRadius: config.radii.R300,
                          }}
                        >
                          <BiographyDisplay
                            bio={profile.bio}
                            userId={userId}
                            displayName={displayName}
                            avatarUrl={avatarUrl}
                          />
                        </Box>
                      )}
                      <Text size="T200" priority="300">
                        This is how your account looks to others.
                      </Text>
                    </Box>

                    <Box
                      direction="Column"
                      gap="100"
                      style={{
                        backgroundColor: color.SurfaceVariant.Container,
                        borderRadius: config.radii.R400,
                        padding: config.space.S100,
                      }}
                    >
                      <MenuItem
                        size="300"
                        radii="300"
                        before={<Icon size="100" src={Icons.Pencil} />}
                        onClick={handleEditProfile}
                      >
                        <Text as="span" size="T300" style={{ flexGrow: 1 }} truncate>
                          Edit Profile
                        </Text>
                      </MenuItem>
                      <MenuItem
                        size="300"
                        radii="300"
                        before={
                          <span
                            style={{
                              width: toRem(10),
                              height: toRem(10),
                              borderRadius: '50%',
                              backgroundColor: color.Success.Main,
                              display: 'inline-block',
                            }}
                          />
                        }
                        after={<Icon size="100" src={Icons.ChevronRight} />}
                        onClick={handleEditProfile}
                      >
                        <Text as="span" size="T300" style={{ flexGrow: 1 }} truncate>
                          Online
                        </Text>
                      </MenuItem>
                    </Box>

                    <Box
                      direction="Column"
                      gap="100"
                      style={{
                        backgroundColor: color.SurfaceVariant.Container,
                        borderRadius: config.radii.R400,
                        padding: config.space.S100,
                      }}
                    >
                      <MenuItem
                        size="300"
                        radii="300"
                        aria-expanded={switchOpen}
                        before={<Icon size="100" src={Icons.User} />}
                        after={
                          <Icon
                            size="100"
                            src={Icons.ChevronRight}
                            style={
                              showInlineAccounts
                                ? { transform: 'rotate(90deg)', transition: 'transform 150ms' }
                                : { transition: 'transform 150ms' }
                            }
                          />
                        }
                        ref={(el: HTMLButtonElement | null) => {
                          switchRowRef.current = el;
                        }}
                        onMouseEnter={handleSwitchEnter}
                        onMouseLeave={handleSwitchLeave}
                        onClick={handleSwitchClick}
                        onFocus={(evt) => placeFlyout(evt.currentTarget)}
                      >
                        <Text as="span" size="T300" style={{ flexGrow: 1 }} truncate>
                          Switch Accounts
                        </Text>
                      </MenuItem>
                      {showInlineAccounts && (
                        <Box
                          direction="Column"
                          gap="100"
                          onMouseEnter={handleFlyoutEnter}
                          onMouseLeave={handleFlyoutLeave}
                          style={{
                            borderRadius: config.radii.R300,
                            maxHeight: toRem(300),
                            overflowY: 'auto',
                          }}
                        >
                          {renderAccountsList(true)}
                        </Box>
                      )}
                      <Line variant="Surface" size="300" />
                      <MenuItem
                        size="300"
                        radii="300"
                        before={<Icon size="100" src={Icons.Mention} />}
                        after={
                          copied ? (
                            <Icon
                              size="100"
                              src={Icons.Check}
                              style={{ color: color.Success.Main }}
                            />
                          ) : undefined
                        }
                        onClick={handleCopyId}
                      >
                        <Text as="span" size="T300" style={{ flexGrow: 1 }} truncate>
                          {copied ? 'Copied!' : 'Copy User ID'}
                        </Text>
                      </MenuItem>
                      <MenuItem
                        size="300"
                        radii="300"
                        before={<Icon size="100" src={Icons.Setting} />}
                        onClick={handleOpenSettings}
                      >
                        <Text as="span" size="T300" style={{ flexGrow: 1 }} truncate>
                          Settings
                        </Text>
                      </MenuItem>
                    </Box>
                  </Box>
                </Box>
              </Menu>
            </div>
          }
        />
      )}

      {showSideFlyout &&
        flyoutPos &&
        createPortal(
          // Transparent full-viewport layer: unlike folds PopOut (whose layer
          // intercepts pointer events), this lets hover pass through everywhere
          // except on the panel itself, so the trigger row keeps its hover
          // and the flyout can't open/close-loop.
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: config.zIndex.Max,
              pointerEvents: 'none',
            }}
          >
            <div
              ref={flyoutMenuRef}
              onMouseEnter={handleFlyoutEnter}
              onMouseLeave={handleFlyoutLeave}
              style={{
                position: 'fixed',
                left: flyoutPos.left,
                top: flyoutPos.top,
                width: toRem(FLYOUT_WIDTH),
                pointerEvents: 'auto',
              }}
            >
              <Menu style={{ width: toRem(300), maxHeight: toRem(360), overflowY: 'auto' }}>
                {renderAccountsList()}
              </Menu>
            </div>
          </div>,
          document.getElementById('portalContainer') ?? document.body,
        )}

      <Modal500 open={settingsOpen} requestClose={() => setSettingsOpen(false)}>
        <Settings initialPage={settingsPage} requestClose={() => setSettingsOpen(false)} />
      </Modal500>
    </SidebarItem>
  );
}
