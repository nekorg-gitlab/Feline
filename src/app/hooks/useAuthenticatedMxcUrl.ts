import { useCallback, useEffect, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { useSpecVersions } from './useSpecVersions';
import { downloadMedia, mxcUrlToHttp } from '../utils/matrix';

export function useAuthenticatedMxcUrl(
  mxcUrl: string | undefined | null,
  width?: number,
  height?: number,
  resizeMethod?: string
): string | undefined {
  const mx = useMatrixClient();
  const { versions, unstable_features: unstableFeatures } = useSpecVersions();
  const useAuthentication =
    unstableFeatures?.['org.matrix.msc3916.stable'] || versions.includes('v1.11');

  const [url, setUrl] = useState<string | undefined>(() => {
    if (!mxcUrl) return undefined;
    if (!useAuthentication) {
      return mxcUrlToHttp(mx, mxcUrl, false, width, height, resizeMethod) ?? undefined;
    }
    return undefined;
  });

  const load = useCallback(async () => {
    if (!mxcUrl) {
      setUrl(undefined);
      return;
    }
    const mediaUrl = mxcUrlToHttp(mx, mxcUrl, useAuthentication, width, height, resizeMethod);
    if (!mediaUrl) {
      setUrl(undefined);
      return;
    }
    if (!useAuthentication) {
      setUrl(mediaUrl);
      return;
    }
    const tryFetch = async (url: string) => {
      const blob = await downloadMedia(url, mx);
      return URL.createObjectURL(blob);
    };
    try {
      const blobUrl = await tryFetch(mediaUrl);
      setUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return blobUrl;
      });
    } catch {
      const hasThumbnailParams = !!width || !!height || !!resizeMethod;
      if (hasThumbnailParams) {
        const fallbackUrl = mxcUrlToHttp(mx, mxcUrl, useAuthentication);
        if (fallbackUrl && fallbackUrl !== mediaUrl) {
          try {
            const blobUrl = await tryFetch(fallbackUrl);
            setUrl((prev) => {
              if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
              return blobUrl;
            });
            return;
          } catch {}
        }
      }
      setUrl(undefined);
    }
  }, [mx, mxcUrl, useAuthentication, width, height, resizeMethod]);

  useEffect(() => {
    if (useAuthentication && mxcUrl) {
      load();
    } else if (!useAuthentication && mxcUrl) {
      const direct = mxcUrlToHttp(mx, mxcUrl, false, width, height, resizeMethod);
      setUrl(direct ?? undefined);
    } else {
      setUrl(undefined);
    }
    return () => {};
  }, [mxcUrl, useAuthentication, mx, width, height, resizeMethod, load]);

  useEffect(() => {
    return () => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}

export function useAuthenticatedMxcUrls(
  mxcUrls: (string | undefined | null)[],
  width?: number,
  height?: number,
  resizeMethod?: string
): (string | undefined)[] {
  const mx = useMatrixClient();
  const { versions, unstable_features: unstableFeatures } = useSpecVersions();
  const useAuthentication =
    unstableFeatures?.['org.matrix.msc3916.stable'] || versions.includes('v1.11');

  const [urls, setUrls] = useState<(string | undefined)[]>(() =>
    mxcUrls.map((u) => (u && !useAuthentication ? mxcUrlToHttp(mx, u, false, width, height, resizeMethod) ?? undefined : undefined))
  );

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      const results = await Promise.all(
        mxcUrls.map(async (mxcUrl) => {
          if (!mxcUrl) return undefined;
          const mediaUrl = mxcUrlToHttp(mx, mxcUrl, useAuthentication, width, height, resizeMethod);
          if (!mediaUrl) return undefined;
          if (!useAuthentication) return mediaUrl;
          try {
            const blob = await downloadMedia(mediaUrl, mx);
            return URL.createObjectURL(blob);
          } catch {
            const hasThumbnailParams = !!width || !!height || !!resizeMethod;
            if (hasThumbnailParams) {
              const fallbackUrl = mxcUrlToHttp(mx, mxcUrl, useAuthentication);
              if (fallbackUrl && fallbackUrl !== mediaUrl) {
                try {
                  const blob = await downloadMedia(fallbackUrl, mx);
                  return URL.createObjectURL(blob);
                } catch {}
              }
            }
            return undefined;
          }
        })
      );
      if (!cancelled) {
        setUrls((prev) => {
          prev.forEach((u) => u && u.startsWith('blob:') && URL.revokeObjectURL(u));
          return results;
        });
      }
    };
    if (useAuthentication) loadAll();
    else setUrls(mxcUrls.map((u) => (u ? mxcUrlToHttp(mx, u, false, width, height, resizeMethod) ?? undefined : undefined)));
    return () => {
      cancelled = true;
    };
  }, [mx, mxcUrls.join(','), useAuthentication, width, height, resizeMethod]);

  useEffect(() => {
    return () => {
      urls.forEach((u) => u && u.startsWith('blob:') && URL.revokeObjectURL(u));
    };
  }, [urls]);

  return urls;
}
