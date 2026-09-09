import { isAndroidWebView } from './isTauri';

/**
 * Central place for media capability quirks across browsers and the Tauri
 * Android WebView (where `getDisplayMedia` and `setSinkId` are unavailable).
 */

export const supportsScreenShare = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
  !isAndroidWebView();

export const screenShareUnavailableReason = (): string | null => {
  if (supportsScreenShare()) return null;
  if (isAndroidWebView()) {
    return 'Screen sharing is not available in the Android app yet. Please share from desktop.';
  }
  return 'Screen sharing is not supported by this browser.';
};

export const supportsAudioOutputSelection = (): boolean => {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('audio');
  return (
    typeof (el as HTMLAudioElement & { setSinkId?: unknown }).setSinkId === 'function' &&
    !isAndroidWebView()
  );
};

/**
 * Mic constraints tuned per platform. Mobile WebViews (Tauri Android, iOS)
 * rely on OS echo cancellation; forcing it off (as done on desktop for our
 * own denoiser) produces echo on phones.
 */
export const getMicrophoneConstraints = (
  deviceId?: string,
): MediaTrackConstraints & { deviceId?: unknown } => {
  if (isAndroidWebView()) {
    return {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } as MediaTrackConstraints;
  }
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  } as MediaTrackConstraints;
};

/** Best-effort camera constraints with a facingMode fallback for mobile. */
export const getCameraConstraints = (deviceId?: string): MediaTrackConstraints | boolean => {
  if (!deviceId && isAndroidWebView()) return { facingMode: 'user' };
  if (!deviceId) return true;
  return { deviceId: { exact: deviceId } };
};

export const requestCameraStream = async (deviceId?: string): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: getCameraConstraints(deviceId) });
  } catch (err) {
    if (deviceId) {
      // Exact device ids go stale on mobile (OS re-enumerates cameras).
      return navigator.mediaDevices.getUserMedia({ video: getCameraConstraints(undefined) });
    }
    throw err;
  }
};
