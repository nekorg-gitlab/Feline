import React, { useRef } from 'react';
import { Scroll } from 'folds';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
} from '../../components/sidebar';
import {
  HomeTab,
  SpaceTabs,
  InboxTab,
  ExploreTab,
  SettingsTab,
  UnverifiedTab,
  SearchTab,
} from './sidebar';
import { CreateTab } from './sidebar/CreateTab';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

export function SidebarNav() {
  const scrollRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  return (
    <Sidebar data-feline-sidebar={isMobile ? 'tabbar' : 'rail'}>
      <SidebarContent
        scrollable={
          <Scroll
            ref={scrollRef}
            variant="Background"
            size="0"
            direction={isMobile ? 'Horizontal' : 'Vertical'}
            data-feline-tab-scroll={isMobile ? 'true' : undefined}
          >
            <SidebarStack>
              <HomeTab />
            </SidebarStack>
            <SpaceTabs scrollRef={scrollRef} />
            <SidebarStackSeparator />
            <SidebarStack>
              <ExploreTab />
              <CreateTab />
            </SidebarStack>
          </Scroll>
        }
        sticky={
          <>
            <SidebarStackSeparator />
            <SidebarStack>
              <SearchTab />
              <UnverifiedTab />
              <InboxTab />
              <SettingsTab />
            </SidebarStack>
          </>
        }
      />
    </Sidebar>
  );
}
