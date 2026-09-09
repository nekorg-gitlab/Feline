import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

type SidebarContentProps = {
  scrollable: ReactNode;
  sticky: ReactNode;
};
export function SidebarContent({ scrollable, sticky }: SidebarContentProps) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  return (
    <>
      <Box direction={isMobile ? 'Row' : 'Column'} grow="Yes" alignItems="Center">
        {scrollable}
      </Box>
      <Box direction={isMobile ? 'Row' : 'Column'} shrink="No" alignItems="Center">
        {sticky}
      </Box>
    </>
  );
}
