import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';

import { useDebounce } from '../../hooks/useDebounce';
import { stopPropagation } from '../../utils/keyboard';

export function ServerPicker({
  server,
  serverList,
  onServerChange,
}: {
  server: string;
  serverList: string[];
  allowCustomServer?: boolean;
  onServerChange: (server: string) => void;
}) {
  const { t } = useTranslation();
  const [serverMenuAnchor, setServerMenuAnchor] = useState<RectCords>();
  const serverInputRef = useRef<HTMLInputElement>(null as unknown as HTMLInputElement);

  useEffect(() => {
    // sync input with it outside server changes
    if (serverInputRef.current && serverInputRef.current.value !== server) {
      serverInputRef.current.value = server;
    }
  }, [server]);

  const debounceServerSelect = useDebounce(onServerChange, { wait: 700 });

  const handleServerChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const inputServer = evt.target.value.trim();
    if (inputServer) debounceServerSelect(inputServer);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      setServerMenuAnchor(undefined);
    }
    if (evt.key === 'Enter') {
      evt.preventDefault();
      const inputServer = evt.currentTarget.value.trim();
      if (inputServer) onServerChange(inputServer);
    }
  };

  const handleServerSelect: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const selectedServer = evt.currentTarget.getAttribute('data-server');
    if (selectedServer) {
      onServerChange(selectedServer);
    }
    setServerMenuAnchor(undefined);
  };

  const handleOpenServerMenu: MouseEventHandler<HTMLElement> = (evt) => {
    const target = evt.currentTarget.parentElement ?? evt.currentTarget;
    setServerMenuAnchor(target.getBoundingClientRect());
  };

  const sortedServerList = useMemo(() => {
    const idx = serverList.indexOf('matrix.org');
    if (idx === 0) return serverList;
    if (idx > 0) {
      const copy = [...serverList];
      copy.splice(idx, 1);
      copy.unshift('matrix.org');
      return copy;
    }
    return ['matrix.org', ...serverList];
  }, [serverList]);

  return (
    <Input
      ref={serverInputRef}
      style={{ paddingRight: config.space.S200 }}
      variant="Background"
      outlined
      defaultValue={server}
      placeholder="matrix.org"
      onChange={handleServerChange}
      onKeyDown={handleKeyDown}
      size="500"
      readOnly={false}
      after={
        serverList.length === 0 ? undefined : (
          <PopOut
            anchor={serverMenuAnchor}
            position="Bottom"
            align="End"
            offset={4}
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setServerMenuAnchor(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Menu>
                  <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
                    <Text size="L400">{t('Common.homeserverList')}</Text>
                  </Header>
                  <div style={{ padding: config.space.S100, paddingTop: 0 }}>
                    {sortedServerList?.map((serverName) => (
                      <MenuItem
                        key={serverName}
                        radii="300"
                        aria-pressed={serverName === server}
                        data-server={serverName}
                        onClick={handleServerSelect}
                      >
                        <Text>{serverName}</Text>
                      </MenuItem>
                    ))}
                  </div>
                </Menu>
              </FocusTrap>
            }
          >
            <IconButton
              onClick={handleOpenServerMenu}
              variant="Background"
              size="300"
              aria-pressed={!!serverMenuAnchor}
              radii="300"
            >
              <Icon src={Icons.ChevronBottom} />
            </IconButton>
          </PopOut>
        )
      }
    />
  );
}
