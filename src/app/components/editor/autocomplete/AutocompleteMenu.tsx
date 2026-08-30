import React, { ReactNode } from 'react';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { Header, Menu, Scroll, config } from 'folds';

import * as css from './AutocompleteMenu.css';
import { preventScrollWithArrowKey, stopPropagation } from '../../../utils/keyboard';
import { useAlive } from '../../../hooks/useAlive';

type AutocompleteMenuProps = {
  requestClose: () => void;
  headerContent: ReactNode;
  children: ReactNode;
};
export function AutocompleteMenu({ headerContent, requestClose, children }: AutocompleteMenuProps) {
  const alive = useAlive();

  const handleDeactivate = () => {
    if (alive()) {
      // Defer to avoid colliding with Slate's DOM sync after mention insertion
      setTimeout(() => {
        if (alive()) {
          try {
            requestClose();
          } catch {}
        }
      }, 0);
    }
  };

  return (
    <div className={css.AutocompleteMenuBase}>
      <div className={css.AutocompleteMenuContainer}>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onPostDeactivate: handleDeactivate,
            returnFocusOnDeactivate: false,
            clickOutsideDeactivates: true,
            allowOutsideClick: true,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu className={css.AutocompleteMenu}>
            <Header className={css.AutocompleteMenuHeader} size="400">
              {headerContent}
            </Header>
            <Scroll style={{ flexGrow: 1 }} onKeyDown={preventScrollWithArrowKey}>
              <div style={{ padding: config.space.S200 }}>{children}</div>
            </Scroll>
          </Menu>
        </FocusTrap>
      </div>
    </div>
  );
}
