import React, { useEffect } from 'react';
import { Provider as JotaiProvider, useAtomValue } from 'jotai';
import { OverlayContainerProvider, PopOutContainerProvider, TooltipContainerProvider } from 'folds';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfigProvider } from '../hooks/useClientConfig';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { createRouter } from './Router';
import { ScreenSizeProvider, useScreenSize } from '../hooks/useScreenSize';
import { useCompositionEndTracking } from '../hooks/useComposingCheck';
import { getThumbnailFallbackUrl } from '../utils/matrix';
import { settingsAtom } from '../state/settings';
import { applyAnimations } from '../utils/animations';
import { applyAppLanguage } from '../i18n';
import { resolveLanguage } from '../utils/language';

const queryClient = new QueryClient();

function AnimationsSync() {
  const settings = useAtomValue(settingsAtom);
  useEffect(() => {
    applyAnimations(settings.animationsEnabled, settings.animationSpeed);
  }, [settings.animationsEnabled, settings.animationSpeed]);
  return null;
}

function LanguageSync() {
  const settings = useAtomValue(settingsAtom);
  useEffect(() => {
    const resolved = resolveLanguage(settings.language);
    applyAppLanguage(settings.language).catch(() => {});
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolved;
    }
  }, [settings.language]);
  return null;
}

function App() {
  const screenSize = useScreenSize();
  useCompositionEndTracking();

  useEffect(() => {
    const handler = (ev: Event) => {
      const target = ev.target as HTMLImageElement;
      if (
        target instanceof HTMLImageElement &&
        target.src.includes('/thumbnail') &&
        target.dataset.thumbnailFallback !== 'true'
      ) {
        const fallback = getThumbnailFallbackUrl(target.src);
        if (fallback) {
          target.dataset.thumbnailFallback = 'true';
          target.src = fallback;
        }
      }
    };
    document.addEventListener('error', handler, true);
    return () => document.removeEventListener('error', handler, true);
  }, []);

  const portalContainer = document.getElementById('portalContainer') ?? undefined;

  return (
    <TooltipContainerProvider value={portalContainer}>
      <PopOutContainerProvider value={portalContainer}>
        <OverlayContainerProvider value={portalContainer}>
          <ScreenSizeProvider value={screenSize}>
            <FeatureCheck>
              <ClientConfigLoader
                fallback={() => <ConfigConfigLoading />}
                error={(err, retry, ignore) => (
                  <ConfigConfigError error={err} retry={retry} ignore={ignore} />
                )}
              >
                {(clientConfig) => (
                  <ClientConfigProvider value={clientConfig}>
                    <QueryClientProvider client={queryClient}>
                      <JotaiProvider>
                        <AnimationsSync />
                        <LanguageSync />
                        <RouterProvider router={createRouter(clientConfig, screenSize)} />
                      </JotaiProvider>
                      <ReactQueryDevtools initialIsOpen={false} />
                    </QueryClientProvider>
                  </ClientConfigProvider>
                )}
              </ClientConfigLoader>
            </FeatureCheck>
          </ScreenSizeProvider>
        </OverlayContainerProvider>
      </PopOutContainerProvider>
    </TooltipContainerProvider>
  );
}

export default App;
