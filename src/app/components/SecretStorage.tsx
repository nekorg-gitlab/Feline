import React, { FormEventHandler, useCallback } from 'react';
import { Box, Text, Button, Spinner, color } from 'folds';
import { decodeRecoveryKey, deriveRecoveryKeyFromPassphrase } from 'matrix-js-sdk/lib/crypto-api';
import { PasswordInput } from './password-input';
import {
  SecretStorageKeyContent,
  SecretStoragePassphraseContent,
} from '../../types/matrix/accountData';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useAlive } from '../hooks/useAlive';

function assertCryptoAvailable() {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'Your browser does not support the required cryptography extensions. Please use a secure (HTTPS) context. Crypto.subtle is not available: insecure context?'
    );
  }
}

function toFriendlyError(e: unknown): Error {
  // preserve friendlyText if present (from cryptE2ERoomKeys friendlyError)
  if (e instanceof Error && (e as any).friendlyText) {
    return new Error((e as any).friendlyText);
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes('importKey') ||
    msg.includes('subtle') ||
    msg.includes('insecure context') ||
    msg.includes('Crypto.subtle is not available') ||
    msg.includes('subtleCrypto is unavailable')
  ) {
    return new Error(
      'Your browser does not support the required cryptography extensions. Please use a secure (HTTPS) context.'
    );
  }
  return e instanceof Error ? e : new Error(String(e));
}

type SecretStorageRecoveryPassphraseProps = {
  processing?: boolean;
  keyContent: SecretStorageKeyContent;
  passphraseContent: SecretStoragePassphraseContent;
  onDecodedRecoveryKey: (recoveryKey: Uint8Array) => void;
};
export function SecretStorageRecoveryPassphrase({
  processing,
  keyContent,
  passphraseContent,
  onDecodedRecoveryKey,
}: SecretStorageRecoveryPassphraseProps) {
  const mx = useMatrixClient();
  const alive = useAlive();

  const [driveKeyState, submitPassphrase] = useAsyncCallback<
    Uint8Array,
    Error,
    Parameters<typeof deriveRecoveryKeyFromPassphrase>
  >(
    useCallback(
      async (passphrase, salt, iterations, bits) => {
        try {
          assertCryptoAvailable();
          const decodedRecoveryKey = await deriveRecoveryKeyFromPassphrase(
            passphrase,
            salt,
            iterations,
            bits
          );

          const match = await mx.secretStorage.checkKey(decodedRecoveryKey, keyContent as any);

          if (!match) {
            throw new Error('Invalid recovery passphrase.');
          }

          return decodedRecoveryKey;
        } catch (e) {
          throw toFriendlyError(e);
        }
      },
      [mx, keyContent]
    )
  );

  const drivingKey = driveKeyState.status === AsyncStatus.Loading;
  const loading = drivingKey || processing;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    if (loading) return;
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const recoveryPassphraseInput = target?.recoveryPassphraseInput as HTMLInputElement | undefined;
    if (!recoveryPassphraseInput) return;
    const recoveryPassphrase = recoveryPassphraseInput.value.trim();
    if (!recoveryPassphrase) return;

    const { salt, iterations, bits } = passphraseContent;
    submitPassphrase(recoveryPassphrase, salt, iterations, bits).then((decodedRecoveryKey) => {
      if (alive()) {
        recoveryPassphraseInput.value = '';
        onDecodedRecoveryKey(decodedRecoveryKey);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="100">
      <Box gap="200" alignItems="End">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Recovery Passphrase</Text>
          <PasswordInput
            name="recoveryPassphraseInput"
            size="400"
            variant="Secondary"
            radii="300"
            autoFocus
            required
            outlined
            readOnly={loading}
          />
        </Box>
        <Box shrink="No" gap="200">
          <Button
            type="submit"
            variant="Success"
            size="400"
            radii="300"
            disabled={loading}
            before={loading && <Spinner size="200" variant="Success" fill="Solid" />}
          >
            <Text as="span" size="B400">
              Verify
            </Text>
          </Button>
        </Box>
      </Box>
      {driveKeyState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{(driveKeyState.error as any).friendlyText || driveKeyState.error.message}</b>
        </Text>
      )}
    </Box>
  );
}

type SecretStorageRecoveryKeyProps = {
  processing?: boolean;
  keyContent: SecretStorageKeyContent;
  onDecodedRecoveryKey: (recoveryKey: Uint8Array) => void;
};
export function SecretStorageRecoveryKey({
  processing,
  keyContent,
  onDecodedRecoveryKey,
}: SecretStorageRecoveryKeyProps) {
  const mx = useMatrixClient();
  const alive = useAlive();

  const [driveKeyState, submitRecoveryKey] = useAsyncCallback<Uint8Array, Error, [string]>(
    useCallback(
      async (recoveryKey) => {
        try {
          assertCryptoAvailable();
          const decodedRecoveryKey = decodeRecoveryKey(recoveryKey);

          const match = await mx.secretStorage.checkKey(decodedRecoveryKey, keyContent as any);

          if (!match) {
            throw new Error('Invalid recovery key.');
          }

          return decodedRecoveryKey;
        } catch (e) {
          throw toFriendlyError(e);
        }
      },
      [mx, keyContent]
    )
  );

  const drivingKey = driveKeyState.status === AsyncStatus.Loading;
  const loading = drivingKey || processing;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const recoveryKeyInput = target?.recoveryKeyInput as HTMLInputElement | undefined;
    if (!recoveryKeyInput) return;
    const recoveryKey = recoveryKeyInput.value.trim();
    if (!recoveryKey) return;

    submitRecoveryKey(recoveryKey).then((decodedRecoveryKey) => {
      if (alive()) {
        recoveryKeyInput.value = '';
        onDecodedRecoveryKey(decodedRecoveryKey);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="100">
      <Box gap="200" alignItems="End">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Recovery Key</Text>
          <PasswordInput
            name="recoveryKeyInput"
            size="400"
            variant="Secondary"
            radii="300"
            autoFocus
            required
            outlined
            readOnly={loading}
          />
        </Box>
        <Box shrink="No" gap="200">
          <Button
            type="submit"
            variant="Success"
            size="400"
            radii="300"
            disabled={loading}
            before={loading && <Spinner size="200" variant="Success" fill="Solid" />}
          >
            <Text as="span" size="B400">
              Verify
            </Text>
          </Button>
        </Box>
      </Box>
      {driveKeyState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{(driveKeyState.error as any).friendlyText || driveKeyState.error.message}</b>
        </Text>
      )}
    </Box>
  );
}
