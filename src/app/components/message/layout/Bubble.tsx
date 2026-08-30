import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type BubbleLayoutProps = {
  hideBubble?: boolean;
  before?: ReactNode;
  header?: ReactNode;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(
  ({ hideBubble, before, header, children, ...props }, ref) => (
    <Box gap="300" {...props} ref={ref}>
      <Box className={css.BubbleBefore} shrink="No">
        {before}
      </Box>
      <Box grow="Yes" direction="Column">
        {header}
        {hideBubble ? (
          children
        ) : (
          <Box>
            <Box className={hideBubble ? undefined : css.BubbleContent} direction="Column">
              {children}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  ),
);
