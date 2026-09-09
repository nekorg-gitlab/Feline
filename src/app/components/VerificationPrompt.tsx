import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  Dialog,
  Header,
  Icon,
  Icons,
  IconButton,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  Spinner,
  config,
  color,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import FileSaver from 'file-saver';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useCrossSigningActive } from '../hooks/useCrossSigning';
import {
  useDeviceVerificationStatus,
  VerificationStatus,
} from '../hooks/useDeviceVerificationStatus';
import {
  useSecretStorageDefaultKeyId,
  useSecretStorageKeyContent,
} from '../hooks/useSecretStorage';
import { useDeviceList, useSplitCurrentDevice } from '../hooks/useDeviceList';
import { ManualVerificationMethod, ManualVerificationMethodSwitcher } from './ManualVerification';
import { SecretStorageRecoveryKey, SecretStorageRecoveryPassphrase } from './SecretStorage';
import { useAsyncCallback, AsyncStatus } from '../hooks/useAsyncCallback';
import { storePrivateKey } from '../../client/secretStorageKeys';
import { ContainerColor } from '../styles/ContainerColor.css';
import { copyToClipboard } from '../utils/dom';
import {
  getVerificationChoice,
  setVerificationDismissed,
  setVerificationHasReset,
  storeRecoveryKey,
} from '../utils/verification';
import { SetupVerification } from './DeviceVerificationSetup';
import { decodeRecoveryKey } from 'matrix-js-sdk/lib/crypto-api';
import { PasswordInput } from './password-input';
import { useVerificationRequestReceived } from '../hooks/useVerificationRequest';
import { useAuthMetadata } from '../hooks/useAuthMetadata';
import { useAccountManagementActions } from '../hooks/useAccountManagement';
import { withSearchParam } from '../pages/pathUtils';

function BigRecoveryKeyDisplay({ recoveryKey }: { recoveryKey: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  const handleCopy = () => {
    copyToClipboard(recoveryKey);
  };

  const handleDownload = () => {
    const blob = new Blob([recoveryKey], {
      type: 'text/plain;charset=us-ascii',
    });
    FileSaver.saveAs(blob, 'recovery-key.txt');
  };

  const safeToDisplayKey = show ? recoveryKey : recoveryKey.replace(/[^\s]/g, '*');

  return (
    <Box direction="Column" gap="500" alignItems="Center">
      <Text size="H2" style={{ textAlign: 'center' }}>
        Your Recovery Key
      </Text>
      <Text size="T300" style={{ textAlign: 'center', maxWidth: '480px' }}>
        Store this Recovery Key in a safe place. You will need it to verify new devices. This is the
        only time it will be shown in full.
      </Text>
      <Box
        className={ContainerColor({ variant: 'SurfaceVariant' })}
        style={{
          padding: config.space.S500,
          borderRadius: config.radii.R400,
          width: '100%',
        }}
        direction="Column"
        alignItems="Center"
        gap="300"
      >
        <Text
          style={{
            fontFamily: 'monospace',
            fontSize: '22px',
            lineHeight: '1.6',
            wordBreak: 'break-all',
            textAlign: 'center',
          }}
          priority="300"
        >
          {safeToDisplayKey}
        </Text>
        <Chip onClick={() => setShow(!show)} variant="Secondary" radii="Pill">
          <Text size="B300">{show ? 'Hide' : 'Show'}</Text>
        </Chip>
      </Box>
      <Box direction="Column" gap="200" style={{ width: '100%' }}>
        <Button size="500" onClick={handleCopy}>
          <Text size="B400">Copy</Text>
        </Button>
        <Button size="500" variant="Success" fill="Solid" onClick={handleDownload}>
          <Text size="B400">Download</Text>
        </Button>
      </Box>
    </Box>
  );
}

function GenericRecoveryKeyFallback() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement & { recoveryKeyInput: HTMLInputElement };
    const rawKey = target.recoveryKeyInput.value.trim();
    if (!rawKey) return;
    setError(undefined);
    setLoading(true);
    try {
      const decoded = decodeRecoveryKey(rawKey);
      let keyId: string | undefined;
      try {
        const defaultData = mx
          .getAccountData('m.secret_storage.default_key' as any)
          ?.getContent() as { key?: string } | undefined;
        keyId = defaultData?.key;
      } catch {
        keyId = undefined;
      }
      if (!keyId) {
        throw new Error(
          'No recovery key ID found on your account. If you have lost your key, please use Reset.',
        );
      }
      const keyContent = mx.getAccountData(`m.secret_storage.key.${keyId}` as any)?.getContent() as
        import('../../types/matrix/accountData').SecretStorageKeyContent | undefined;
      if (keyContent) {
        const match = await mx.secretStorage.checkKey(decoded as any, keyContent as any);
        if (!match) throw new Error('Invalid recovery key.');
      }
      storePrivateKey(keyId, decoded);
      const crypto = mx.getCrypto();
      if (!crypto) throw new Error('Crypto not available');
      if (!globalThis.crypto?.subtle) {
        throw new Error(
          'Your browser does not support cryptography (need HTTPS). Please use a secure context.',
        );
      }
      await crypto.bootstrapCrossSigning({});
      await crypto.bootstrapSecretStorage({});
      await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
      setSuccess(true);
      target.recoveryKeyInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Text size="T200" style={{ color: color.Success.Main }}>
        <b>Device verified! Close this window if it does not disappear.</b>
      </Text>
    );
  }

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="200" autoComplete="off">
      <Text size="T300">Paste your recovery key to unlock your messages.</Text>
      <Box direction="Column" gap="100">
        <Text size="L400">Recovery Key</Text>
        <PasswordInput
          name="recoveryKeyInput"
          size="400"
          required
          outlined
          autoFocus
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
        />
      </Box>
      <Button
        type="submit"
        variant="Success"
        size="400"
        radii="300"
        disabled={loading}
        before={loading && <Spinner size="200" variant="Success" fill="Solid" />}
      >
        <Text size="B400">Verify</Text>
      </Button>
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{error}</b>
        </Text>
      )}
    </Box>
  );
}

type VerifyByKeyProps = {
  secretStorageKeyId: string;
  secretStorageKeyContent: import('../../types/matrix/accountData').SecretStorageKeyContent;
};

function VerifyByKey({ secretStorageKeyId, secretStorageKeyContent }: VerifyByKeyProps) {
  const mx = useMatrixClient();

  const hasPassphrase = !!secretStorageKeyContent.passphrase;
  const [method, setMethod] = useState(
    hasPassphrase
      ? ManualVerificationMethod.RecoveryPassphrase
      : ManualVerificationMethod.RecoveryKey,
  );

  const verifyAndRestoreBackup = useCallback(
    async (recoveryKey: Uint8Array) => {
      try {
        const crypto = mx.getCrypto();
        if (!crypto) {
          throw new Error('Unexpected Error! Crypto object not found.');
        }
        if (!globalThis.crypto?.subtle) {
          throw new Error(
            'Your browser does not support the required cryptography extensions. Please use a secure (HTTPS) context.',
          );
        }
        storePrivateKey(secretStorageKeyId, recoveryKey);
        await crypto.bootstrapCrossSigning({});
        await crypto.bootstrapSecretStorage({});
        await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
      } catch (e) {
        if ((e as any)?.friendlyText) {
          throw new Error((e as any).friendlyText);
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes('importKey') ||
          msg.includes('subtle') ||
          msg.includes('insecure context') ||
          msg.includes('Crypto.subtle is not available') ||
          msg.includes('subtleCrypto is unavailable')
        ) {
          throw new Error(
            'Your browser does not support the required cryptography extensions. Please use a secure (HTTPS) context.',
          );
        }
        throw e;
      }
    },
    [mx, secretStorageKeyId],
  );

  const [verifyState, handleDecodedRecoveryKey] = useAsyncCallback(verifyAndRestoreBackup);
  const verifying = verifyState.status === AsyncStatus.Loading;
  const insecureContext = typeof globalThis !== 'undefined' && !globalThis.crypto?.subtle;

  return (
    <Box direction="Column" gap="300">
      {insecureContext && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>
            Cryptography unavailable: this page is not in a secure (HTTPS) context. Please access
            via HTTPS to verify your session.
          </b>
        </Text>
      )}
      <Box direction="Column" gap="200">
        <Box justifyContent="SpaceBetween" alignItems="Center" gap="200">
          <Text size="L400">Verify with Recovery Key or Passphrase</Text>
          {hasPassphrase && (
            <ManualVerificationMethodSwitcher value={method} onChange={setMethod} />
          )}
        </Box>
        {verifyState.status === AsyncStatus.Success ? (
          <Text size="T200" style={{ color: color.Success.Main }}>
            <b>Device verified!</b>
          </Text>
        ) : (
          <Box direction="Column" gap="100">
            {method === ManualVerificationMethod.RecoveryKey && (
              <SecretStorageRecoveryKey
                processing={verifying}
                keyContent={secretStorageKeyContent}
                onDecodedRecoveryKey={handleDecodedRecoveryKey}
              />
            )}
            {method === ManualVerificationMethod.RecoveryPassphrase &&
              secretStorageKeyContent.passphrase && (
                <SecretStorageRecoveryPassphrase
                  processing={verifying}
                  keyContent={secretStorageKeyContent}
                  passphraseContent={secretStorageKeyContent.passphrase}
                  onDecodedRecoveryKey={handleDecodedRecoveryKey}
                />
              )}
            {verifyState.status === AsyncStatus.Error && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                <b>
                  {(verifyState.error as Error & { friendlyText?: string }).friendlyText ||
                    (verifyState.error as Error).message}
                </b>
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function VerificationPrompt() {
  const mx = useMatrixClient();
  const crypto = mx.getCrypto();
  const userId = mx.getSafeUserId();
  const [devices] = useDeviceList();
  const [currentDevice] = useSplitCurrentDevice(devices);
  const deviceId = currentDevice?.device_id ?? (mx.getDeviceId() as string | undefined);
  const verificationStatus = useDeviceVerificationStatus(crypto, userId, deviceId);
  const crossSigningActive = useCrossSigningActive();
  const defaultKeyId = useSecretStorageDefaultKeyId();
  const defaultKeyContent = useSecretStorageKeyContent(defaultKeyId ?? '');

  const [tempHidden, setTempHidden] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetSetupOpen, setResetSetupOpen] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | undefined>(undefined);
  const [hasIncomingVerification, setHasIncomingVerification] = useState(false);
  const authMetadata = useAuthMetadata();
  const accountManagementActions = useAccountManagementActions();

  useVerificationRequestReceived(
    useCallback((req) => {
      if (req.isSelfVerification) {
        setHasIncomingVerification(true);
      }
    }, []),
  );

  const choice = getVerificationChoice(userId);
  const shouldShow =
    crossSigningActive &&
    verificationStatus === VerificationStatus.Unverified &&
    !choice.dismissed &&
    !tempHidden;

  const handleStayUnverified = useCallback(() => {
    setVerificationDismissed(userId, true);
    setTempHidden(true);
  }, [userId]);

  const handleResetComplete = useCallback(
    (key: string) => {
      setVerificationHasReset(userId, true);
      storeRecoveryKey(userId, key);
      setNewRecoveryKey(key);
      setResetSetupOpen(false);
    },
    [userId],
  );

  const handleSetupComplete = useCallback(
    (key: string) => {
      handleResetComplete(key);
    },
    [handleResetComplete],
  );

  if (newRecoveryKey) {
    return (
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: false,
              escapeDeactivates: false,
            }}
          >
            <Dialog style={{ maxWidth: '640px', width: '90vw' }}>
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Recovery Key</Text>
                </Box>
                <IconButton size="300" radii="300" onClick={() => setNewRecoveryKey(undefined)}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box style={{ padding: config.space.S500 }} direction="Column" gap="400">
                <BigRecoveryKeyDisplay recoveryKey={newRecoveryKey} />
                <Button variant="Success" size="500" onClick={() => setNewRecoveryKey(undefined)}>
                  <Text size="B400">Done</Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    );
  }

  if (resetSetupOpen) {
    const handleCancelSetup = () => {
      setResetSetupOpen(false);
    };

    return (
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: false,
              escapeDeactivates: false,
            }}
          >
            <Dialog style={{ maxWidth: '640px', width: '90vw' }}>
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Reset Device Verification</Text>
                </Box>
                <IconButton size="300" radii="300" onClick={handleCancelSetup}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <SetupVerification onComplete={handleSetupComplete} />
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    );
  }

  if (!shouldShow) return null;

  const handleCloseTemp = () => setTempHidden(true);

  return (
    <>
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: false,
              escapeDeactivates: false,
            }}
          >
            <Dialog style={{ maxWidth: '640px', width: '90vw', maxHeight: '90vh' }}>
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Verify Your Device</Text>
                </Box>
                <IconButton size="300" radii="300" onClick={handleCloseTemp}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                style={{ padding: config.space.S400, overflowY: 'auto' }}
                direction="Column"
                gap="400"
              >
                <Box direction="Column" gap="200">
                  <Text size="T300">Choose how to verify:</Text>
                  <Box
                    className={ContainerColor({ variant: 'SurfaceVariant' })}
                    style={{ padding: config.space.S300, borderRadius: config.radii.R400 }}
                    direction="Column"
                    gap="100"
                  >
                    <Text size="T200">
                      <b>Have your key?</b> Paste it below.
                    </Text>
                    <Text size="T200">
                      <b>Have another device?</b> On that device: <b>Settings → Devices</b> → tap{' '}
                      <b>Feline Web</b> → <b>Verify</b>.
                    </Text>
                  </Box>
                  {hasIncomingVerification && (
                    <Box
                      className={ContainerColor({ variant: 'Success' })}
                      style={{
                        padding: config.space.S300,
                        borderRadius: config.radii.R400,
                        border: `1px solid ${color.Success.Main}`,
                      }}
                      direction="Column"
                      gap="100"
                    >
                      <Text size="T200" style={{ color: color.Success.Main }}>
                        <b>Check your other device!</b> A verification popup is waiting, compare
                        emojis to finish.
                      </Text>
                    </Box>
                  )}
                </Box>

                {defaultKeyId && defaultKeyContent ? (
                  <VerifyByKey
                    secretStorageKeyId={defaultKeyId}
                    secretStorageKeyContent={defaultKeyContent}
                  />
                ) : (
                  <GenericRecoveryKeyFallback />
                )}

                <Button
                  variant="Critical"
                  fill="Soft"
                  size="500"
                  style={{ width: '100%' }}
                  onClick={() => setResetConfirmOpen(true)}
                >
                  <Text size="B400">Don&apos;t have your key? Reset now</Text>
                </Button>

                <Box direction="Column" gap="200" alignItems="Center">
                  <Button
                    variant="Secondary"
                    fill="Soft"
                    size="300"
                    outlined
                    onClick={() => setShowAdvanced((v) => !v)}
                    after={
                      <Icon
                        size="100"
                        src={Icons.ChevronBottom}
                        style={{
                          transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 150ms ease',
                        }}
                      />
                    }
                    aria-pressed={showAdvanced}
                  >
                    <Text as="span" size="B300">
                      Advanced
                    </Text>
                  </Button>
                  <Text size="T200" priority="300" align="Center">
                    If you want to stay unverified, click Advanced.
                  </Text>
                  {showAdvanced && (
                    <Box
                      className={ContainerColor({ variant: 'SurfaceVariant' })}
                      style={{
                        padding: config.space.S300,
                        borderRadius: config.radii.R400,
                        width: '100%',
                      }}
                      direction="Column"
                      gap="200"
                    >
                      <Text size="T200">
                        Stay unverified? You won&apos;t see encrypted messages. Only for advanced
                        users.
                      </Text>
                      <Button variant="Warning" size="300" onClick={handleStayUnverified}>
                        <Text size="B300">Stay Unverified</Text>
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>

      {resetConfirmOpen && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                clickOutsideDeactivates: false,
                escapeDeactivates: false,
              }}
            >
              <Dialog style={{ maxWidth: '480px', width: '90vw' }}>
                <Header
                  style={{
                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                    borderBottomWidth: config.borderWidth.B300,
                  }}
                  variant="Surface"
                  size="500"
                >
                  <Box grow="Yes">
                    <Text size="H4">Reset Verification?</Text>
                  </Box>
                  <IconButton size="300" radii="300" onClick={() => setResetConfirmOpen(false)}>
                    <Icon src={Icons.Cross} />
                  </IconButton>
                </Header>
                <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                  <Box direction="Column" gap="200">
                    <Text size="H1">⚠️</Text>
                    <Text size="T300">You are about to reset your verification.</Text>
                    <Text size="T300">
                      <b>You will lose all your old encrypted conversations</b>. They will show as
                      &quot;Unable to decrypt because you reset your verification&quot; and cannot
                      be recovered. Only continue if you have lost your recovery key and have no
                      other verified device.
                    </Text>
                    <Text size="T300">This action is permanent and cannot be undone.</Text>
                    {authMetadata && (
                      <Text size="T200" style={{ color: color.Critical.Main }}>
                        <b>Matrix.org:</b> Clicking Reset will open account management to approve.
                        After approval (valid 10 min), return here to generate your new recovery
                        key.
                      </Text>
                    )}
                  </Box>
                  <Box gap="200">
                    <Button
                      variant="Secondary"
                      fill="Soft"
                      onClick={() => setResetConfirmOpen(false)}
                      style={{ flex: 1 }}
                    >
                      <Text size="B400">Cancel</Text>
                    </Button>
                    <Button
                      variant="Critical"
                      onClick={() => {
                        if (authMetadata) {
                          const authUrl =
                            authMetadata.account_management_uri ?? authMetadata.issuer;
                          window.open(
                            withSearchParam(authUrl, {
                              action: accountManagementActions.crossSigningReset,
                            }),
                            '_blank',
                          );
                        }
                        setResetConfirmOpen(false);
                        setResetSetupOpen(true);
                      }}
                      style={{ flex: 1 }}
                    >
                      <Text size="B400">Reset</Text>
                    </Button>
                  </Box>
                </Box>
              </Dialog>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}
