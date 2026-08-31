import { getFallbackSession } from '../state/sessions';

export type VerificationChoice = {
  dismissed: boolean;
  hasReset: boolean;
};

const choiceKey = (userId: string) => `feline:verification:choice:${userId}`;
const recoveryKeyKey = (userId: string) => `feline:recoveryKey:${userId}`;

export const getVerificationChoice = (userId: string): VerificationChoice => {
  try {
    const raw = localStorage.getItem(choiceKey(userId));
    if (!raw) return { dismissed: false, hasReset: false };
    const parsed = JSON.parse(raw) as Partial<VerificationChoice>;
    return {
      dismissed: !!parsed.dismissed,
      hasReset: !!parsed.hasReset,
    };
  } catch {
    return { dismissed: false, hasReset: false };
  }
};

export const setVerificationDismissed = (userId: string, dismissed: boolean): void => {
  const current = getVerificationChoice(userId);
  const next: VerificationChoice = { ...current, dismissed };
  localStorage.setItem(choiceKey(userId), JSON.stringify(next));
};

export const setVerificationHasReset = (userId: string, hasReset: boolean): void => {
  const current = getVerificationChoice(userId);
  const next: VerificationChoice = { ...current, hasReset };
  localStorage.setItem(choiceKey(userId), JSON.stringify(next));
};

export const getDecryptionErrorMessage = (): string => {
  const session = getFallbackSession();
  if (!session) return 'Unable to decrypt message';
  const choice = getVerificationChoice(session.userId);
  if (choice.hasReset) return 'Unable to decrypt because you reset your verification';
  if (choice.dismissed) return "You can't see this message because you are unverified";
  return 'Unable to decrypt message';
};

export const getNotDecryptedMessage = (): string => {
  const session = getFallbackSession();
  if (!session) return 'This message is not decrypted yet';
  const choice = getVerificationChoice(session.userId);
  if (choice.hasReset) return 'Unable to decrypt because you reset your verification';
  if (choice.dismissed) return "You can't see this message because you are unverified";
  return 'This message is not decrypted yet';
};

export const storeRecoveryKey = (userId: string, key: string): void => {
  localStorage.setItem(recoveryKeyKey(userId), key);
};

export const getStoredRecoveryKey = (userId: string): string | null =>
  localStorage.getItem(recoveryKeyKey(userId));
