import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { MobileStatusScrim, MobileSwipeBack, useMobileViewportHeight } from '../MobileFriendly';

type ClientLayoutProps = {
  nav: ReactNode;
  children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  useMobileViewportHeight(isMobile);

  if (isMobile) {
    return (
      <Box grow="Yes" direction="Column">
        <MobileStatusScrim />
        <MobileSwipeBack />
        <Box grow="Yes" direction="Column" style={{ minHeight: 0 }}>
          {children}
        </Box>
        <Box shrink="No" data-feline-client-nav="">
          {nav}
        </Box>
      </Box>
    );
  }

  return (
    <Box grow="Yes">
      <Box shrink="No">{nav}</Box>
      <Box grow="Yes">{children}</Box>
    </Box>
  );
}
