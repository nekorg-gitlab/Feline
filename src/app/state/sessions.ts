export type Session = {
  baseUrl: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  expiresInMs?: number;
  refreshToken?: string;
  fallbackSdkStores?: boolean;
};

export type Sessions = Session[];
export type SessionStoreName = {
  sync: string;
  crypto: string;
};

export function setFallbackSession(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string
) {
  localStorage.setItem('feline_access_token', accessToken);
  localStorage.setItem('feline_device_id', deviceId);
  localStorage.setItem('feline_user_id', userId);
  localStorage.setItem('feline_hs_base_url', baseUrl);
}
export const removeFallbackSession = () => {
  localStorage.removeItem('feline_hs_base_url');
  localStorage.removeItem('feline_user_id');
  localStorage.removeItem('feline_device_id');
  localStorage.removeItem('feline_access_token');
};
export const getFallbackSession = (): Session | undefined => {
  const baseUrl = localStorage.getItem('feline_hs_base_url');
  const userId = localStorage.getItem('feline_user_id');
  const deviceId = localStorage.getItem('feline_device_id');
  const accessToken = localStorage.getItem('feline_access_token');

  if (baseUrl && userId && deviceId && accessToken) {
    return { baseUrl, userId, deviceId, accessToken, fallbackSdkStores: true };
  }
  return undefined;
};
