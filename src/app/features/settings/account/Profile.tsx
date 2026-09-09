import React, {
  ChangeEventHandler,
  FormEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Input,
  Avatar,
  Button,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Modal,
  Dialog,
  Header,
  config,
  Spinner,
  TextArea,
  Checkbox,
  Scroll,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  BIO_KEY,
  BIO_MAX_BYTES,
  getByteLength,
  UserProfile,
  useUserProfile,
} from '../../../hooks/useUserProfile';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { UserAvatar } from '../../../components/user-avatar';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useAuthenticatedMxcUrl } from '../../../hooks/useAuthenticatedMxcUrl';
import { nameInitials } from '../../../utils/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useFilePicker } from '../../../hooks/useFilePicker';
import { useObjectURL } from '../../../hooks/useObjectURL';
import { stopPropagation } from '../../../utils/keyboard';
import { ImageEditor } from '../../../components/image-editor';
import { ModalWide } from '../../../styles/Modal.css';
import { createUploadAtom, UploadSuccess } from '../../../state/upload';
import { CompactUploadCardRenderer } from '../../../components/upload-card';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { sanitizeCustomHtml } from '../../../utils/sanitize';
import { BiographyDisplay } from '../../../components/user-profile/BiographyDisplay';

type ProfileProps = {
  profile: UserProfile;
  userId: string;
};
function ProfileAvatar({ profile, userId }: ProfileProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const capabilities = useCapabilities();
  const [alertRemove, setAlertRemove] = useState(false);
  const disableSetAvatar = capabilities['m.set_avatar_url']?.enabled === false;

  const defaultDisplayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const directUrl = profile.avatarUrl
    ? (mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const authUrl = useAuthenticatedMxcUrl(profile.avatarUrl, 96, 96, 'crop');
  const avatarUrl = useAuthentication ? authUrl : directUrl;

  const [imageFile, setImageFile] = useState<File>();
  const imageFileURL = useObjectURL(imageFile);
  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);

  const pickFile = useFilePicker(setImageFile, false);

  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
  }, []);

  const handleUploaded = useCallback(
    (upload: UploadSuccess) => {
      const { mxc } = upload;
      mx.setAvatarUrl(mxc);
      handleRemoveUpload();
    },
    [mx, handleRemoveUpload],
  );

  const handleRemoveAvatar = () => {
    mx.setAvatarUrl('');
    setAlertRemove(false);
  };

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          {t('Common.avatar')}
        </Text>
      }
      after={
        <Avatar size="500" radii="400">
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            renderFallback={() => <Text size="H4">{nameInitials(defaultDisplayName)}</Text>}
          />
        </Avatar>
      }
    >
      {uploadAtom ? (
        <Box gap="200" direction="Column">
          <CompactUploadCardRenderer
            uploadAtom={uploadAtom}
            onRemove={handleRemoveUpload}
            onComplete={handleUploaded}
          />
        </Box>
      ) : (
        <Box gap="200">
          <Button
            onClick={() => pickFile('image/*')}
            size="300"
            variant="Secondary"
            fill="Soft"
            outlined
            radii="300"
            disabled={disableSetAvatar}
          >
            <Text size="B300">{t('Common.upload')}</Text>
          </Button>
          {avatarUrl && (
            <Button
              size="300"
              variant="Critical"
              fill="None"
              radii="300"
              disabled={disableSetAvatar}
              onClick={() => setAlertRemove(true)}
            >
              <Text size="B300">{t('Common.remove')}</Text>
            </Button>
          )}
        </Box>
      )}

      {imageFileURL && (
        <Overlay open={false} backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: handleRemoveUpload,
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal className={ModalWide} variant="Surface" size="500">
                <ImageEditor
                  name={imageFile?.name ?? 'Unnamed'}
                  url={imageFileURL}
                  requestClose={handleRemoveUpload}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}

      <Overlay open={alertRemove} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setAlertRemove(false),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">{t('Common.removeAvatar')}</Text>
                </Box>
                <IconButton size="300" onClick={() => setAlertRemove(false)} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Box direction="Column" gap="200">
                  <Text priority="400">{t('UI.areYouSureYouWantToRemoveProfileAvatar')}</Text>
                </Box>
                <Button variant="Critical" onClick={handleRemoveAvatar}>
                  <Text size="B400">{t('Common.remove')}</Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    </SettingTile>
  );
}

function ProfileDisplayName({ profile, userId }: ProfileProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const capabilities = useCapabilities();
  const disableSetDisplayname = capabilities['m.set_displayname']?.enabled === false;

  const defaultDisplayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const [displayName, setDisplayName] = useState<string>(defaultDisplayName);

  const [changeState, changeDisplayName] = useAsyncCallback(
    useCallback((name: string) => mx.setDisplayName(name), [mx]),
  );
  const changingDisplayName = changeState.status === AsyncStatus.Loading;

  useEffect(() => {
    setDisplayName(defaultDisplayName);
  }, [defaultDisplayName]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const name = evt.currentTarget.value;
    setDisplayName(name);
  };

  const handleReset = () => {
    setDisplayName(defaultDisplayName);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (changingDisplayName) return;

    const target = evt.target as HTMLFormElement | undefined;
    const displayNameInput = target?.displayNameInput as HTMLInputElement | undefined;
    const name = displayNameInput?.value;
    if (!name) return;

    changeDisplayName(name);
  };

  const hasChanges = displayName !== defaultDisplayName;
  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          {t('Common.displayName')}
        </Text>
      }
    >
      <Box direction="Column" grow="Yes" gap="100">
        <Box
          as="form"
          onSubmit={handleSubmit}
          gap="200"
          aria-disabled={changingDisplayName || disableSetDisplayname}
        >
          <Box grow="Yes" direction="Column">
            <Input
              required
              name="displayNameInput"
              value={displayName}
              onChange={handleChange}
              variant="Secondary"
              radii="300"
              style={{ paddingRight: config.space.S200 }}
              readOnly={changingDisplayName || disableSetDisplayname}
              after={
                hasChanges &&
                !changingDisplayName && (
                  <IconButton
                    type="reset"
                    onClick={handleReset}
                    size="300"
                    radii="300"
                    variant="Secondary"
                  >
                    <Icon src={Icons.Cross} size="100" />
                  </IconButton>
                )
              }
            />
          </Box>
          <Button
            size="400"
            variant={hasChanges ? 'Success' : 'Secondary'}
            fill={hasChanges ? 'Solid' : 'Soft'}
            outlined
            radii="300"
            disabled={!hasChanges || changingDisplayName}
            type="submit"
          >
            {changingDisplayName && <Spinner variant="Success" fill="Solid" size="300" />}
            <Text size="B400">{t('Common.save')}</Text>
          </Button>
        </Box>
      </Box>
    </SettingTile>
  );
}

function ProfileBiography({ profile, userId }: ProfileProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [supportsExtended, setSupportsExtended] = useState<boolean | null>(null);
  const initialBio = profile.bio ?? '';
  const [bioDraft, setBioDraft] = useState(initialBio);
  const [savedBio, setSavedBio] = useState(initialBio);
  const [richText, setRichText] = useState(() => /<[^>]+>/.test(initialBio));
  const [savedRichText, setSavedRichText] = useState(() => /<[^>]+>/.test(initialBio));
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const displayNamePreview = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const directAvatarUrl = useMemo(
    () =>
      profile.avatarUrl
        ? (mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined)
        : undefined,
    [mx, profile.avatarUrl, useAuthentication],
  );
  const authAvatarUrl = useAuthenticatedMxcUrl(profile.avatarUrl, 96, 96, 'crop');
  const avatarUrlPreview = useAuthentication ? authAvatarUrl : directAvatarUrl;

  useEffect(() => {
    setBioDraft(profile.bio ?? '');
    setSavedBio(profile.bio ?? '');
    const isHtml = /<[^>]+>/.test(profile.bio ?? '');
    setRichText(isHtml);
    setSavedRichText(isHtml);
  }, [profile.bio]);

  useEffect(() => {
    let alive = true;
    mx.doesServerSupportExtendedProfiles()
      .then((supported) => {
        if (alive) setSupportsExtended(supported);
      })
      .catch(() => {
        if (alive) setSupportsExtended(false);
      });
    return () => {
      alive = false;
    };
  }, [mx]);

  const [saveState, saveBio] = useAsyncCallback(
    useCallback(
      async (bio: string, isRich: boolean) => {
        const valueToStore = isRich ? sanitizeCustomHtml(bio) : bio;
        const trimmed = valueToStore.trim();
        if (!trimmed) {
          await mx.deleteExtendedProfileProperty(BIO_KEY);
          try {
            const store = (
              mx as unknown as {
                store?: {
                  getUserProfile?: (id: string) => Promise<Record<string, unknown> | null>;
                  storeUserProfiles?: (m: Map<string, Record<string, unknown>>) => Promise<void>;
                };
              }
            ).store;
            if (store?.getUserProfile && store?.storeUserProfiles) {
              const existing = await store.getUserProfile(userId);
              if (existing && BIO_KEY in existing) {
                const updated = { ...existing };
                delete updated[BIO_KEY];
                await store.storeUserProfiles(new Map([[userId, updated]]));
              }
            }
          } catch {}
          return '';
        }
        await mx.setExtendedProfileProperty(BIO_KEY, trimmed);
        try {
          const store = (
            mx as unknown as {
              store?: {
                getUserProfile?: (id: string) => Promise<Record<string, unknown> | null>;
                storeUserProfiles?: (m: Map<string, Record<string, unknown>>) => Promise<void>;
              };
            }
          ).store;
          if (store?.getUserProfile && store?.storeUserProfiles) {
            const existing = (await store.getUserProfile(userId)) ?? {};
            const updated = { ...existing, [BIO_KEY]: trimmed };
            await store.storeUserProfiles(new Map([[userId, updated]]));
          }
        } catch {}
        return trimmed;
      },
      [mx, userId],
    ),
  );

  const saving = saveState.status === AsyncStatus.Loading;
  const saveError =
    saveState.status === AsyncStatus.Error ? (saveState.error as Error)?.message : undefined;

  const byteLength = useMemo(() => {
    const val = richText ? sanitizeCustomHtml(bioDraft) : bioDraft;
    return getByteLength(val);
  }, [bioDraft, richText]);

  const overLimit = byteLength > BIO_MAX_BYTES;
  const nearLimit = byteLength > BIO_MAX_BYTES * 0.9 && !overLimit;
  const hasChanges = bioDraft !== savedBio || richText !== savedRichText;

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (evt) => {
    setBioDraft(evt.currentTarget.value);
  };

  const handleReset = () => {
    setBioDraft(savedBio);
    setRichText(savedRichText);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    if (saving || overLimit) return;
    try {
      const result = await saveBio(bioDraft, richText);
      setSavedBio(result as string);
      setBioDraft(result as string);
      setSavedRichText(richText);
    } catch {}
  };

  const insertTag = (openTag: string, closeTag: string) => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = bioDraft.slice(start, end);
    const before = bioDraft.slice(0, start);
    const after = bioDraft.slice(end);
    const next = `${before}${openTag}${selected}${closeTag}${after}`;
    setBioDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + openTag.length + selected.length + closeTag.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleClear = () => {
    setBioDraft('');
  };

  if (supportsExtended === false) {
    return (
      <SettingTile
        title={
          <Text as="span" size="L400">
            {t('Common.profileBiography')}
          </Text>
        }
      >
        <Box direction="Column" gap="200">
          <Text size="T300" priority="400">
            {t('Common.biographyHomeserverNotSupported')}
          </Text>
          {profile.bio && (
            <Box
              direction="Column"
              gap="100"
              style={{
                padding: config.space.S300,
                border: `1px solid ${config.borderWidth.B300}`,
                borderRadius: config.radii.R300,
              }}
            >
              <BiographyDisplay bio={profile.bio} />
            </Box>
          )}
        </Box>
      </SettingTile>
    );
  }

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          {t('Common.profileBiography')}
        </Text>
      }
    >
      <Box as="form" onSubmit={handleSubmit} direction="Column" gap="300" grow="Yes">
        <Box direction="Column" gap="100" grow="Yes">
          <TextArea
            ref={textAreaRef}
            value={bioDraft}
            onChange={handleChange}
            variant="Secondary"
            radii="300"
            rows={5}
            placeholder="Write something about yourself..."
            resize="Vertical"
            style={{ minHeight: '80px' }}
          />
          <Box gap="200" wrap="Wrap" alignItems="Center">
            <Box gap="100" alignItems="Center">
              <Checkbox
                checked={richText}
                onClick={() => setRichText(!richText)}
                size="300"
                variant="Primary"
              />
              <Text size="B300">Rich Text / HTML Formatting</Text>
            </Box>
            {richText && (
              <Box gap="100" wrap="Wrap">
                <Button
                  type="button"
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  onClick={() => insertTag('<b>', '</b>')}
                >
                  <Text size="B300">Bold</Text>
                </Button>
                <Button
                  type="button"
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  onClick={() => insertTag('<i>', '</i>')}
                >
                  <Text size="B300">Italic</Text>
                </Button>
                <Button
                  type="button"
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  onClick={() => insertTag('<code>', '</code>')}
                >
                  <Text size="B300">Code</Text>
                </Button>
                <Button
                  type="button"
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  onClick={() => insertTag('<a href="https://">', '</a>')}
                >
                  <Text size="B300">Link</Text>
                </Button>
              </Box>
            )}
          </Box>
          {richText && (
            <Text size="T200" priority="300">
              HTML tags count toward the {BIO_MAX_BYTES.toLocaleString()} byte limit and are
              sanitized on save.
            </Text>
          )}
          <Box justifyContent="SpaceBetween" alignItems="Center" gap="200">
            <Text
              size="T200"
              priority={overLimit ? '400' : '300'}
              style={{ color: overLimit ? 'rgb(var(--folds-color-Critical-600))' : undefined }}
            >
              {byteLength.toLocaleString()} / {BIO_MAX_BYTES.toLocaleString()} bytes
              {overLimit && ' - too large!'}
            </Text>
            {bioDraft && (
              <Button
                type="button"
                size="300"
                variant="Critical"
                fill="None"
                radii="300"
                onClick={handleClear}
              >
                <Text size="B300">Clear</Text>
              </Button>
            )}
          </Box>
          {saveError && (
            <Text size="T200" style={{ color: 'rgb(var(--folds-color-Critical-600))' }}>
              {saveError}
            </Text>
          )}
          {bioDraft !== savedBio && overLimit && (
            <Text size="T200" style={{ color: 'rgb(var(--folds-color-Critical-600))' }}>
              Biography exceeds {BIO_MAX_BYTES.toLocaleString()} bytes (including HTML tags). Please
              shorten it.
            </Text>
          )}
        </Box>

        <Box gap="200" alignItems="Center">
          {hasChanges && !saving && (
            <Button
              type="button"
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              onClick={handleReset}
            >
              <Text size="B300">Reset</Text>
            </Button>
          )}
          <Button
            size="400"
            variant={hasChanges && !overLimit ? 'Success' : 'Secondary'}
            fill={hasChanges && !overLimit ? 'Solid' : 'Soft'}
            outlined
            radii="300"
            disabled={!hasChanges || overLimit || saving}
            type="submit"
          >
            {saving && <Spinner variant="Success" fill="Solid" size="300" />}
            <Text size="B400">Save</Text>
          </Button>
        </Box>

        {bioDraft && (
          <Box direction="Column" gap="100">
            <Text size="L400">Preview</Text>
            <Box
              style={{
                padding: config.space.S300,
                border: `1px solid ${config.borderWidth.B300}`,
                borderRadius: config.radii.R300,
                maxHeight: '240px',
              }}
            >
              <Scroll hideTrack visibility="Hover" size="300">
                <BiographyDisplay
                  bio={richText ? sanitizeCustomHtml(bioDraft) : bioDraft}
                  userId={userId}
                  displayName={displayNamePreview}
                  avatarUrl={avatarUrlPreview}
                />
              </Scroll>
            </Box>
          </Box>
        )}
      </Box>
    </SettingTile>
  );
}

export function Profile() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;
  const profile = useUserProfile(userId);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('Common.profile')}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <ProfileAvatar userId={userId} profile={profile} />
        <ProfileDisplayName userId={userId} profile={profile} />
        <ProfileBiography userId={userId} profile={profile} />
      </SequenceCard>
    </Box>
  );
}
