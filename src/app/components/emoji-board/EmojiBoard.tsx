import React, {
  ChangeEventHandler,
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Button, Spinner, Text, config, Icons, Scroll } from 'folds';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { Room } from 'matrix-js-sdk';
import { atom, PrimitiveAtom, useAtom, useSetAtom } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IEmoji, emojiGroups, emojis } from '../../plugins/emoji';
import { useEmojiGroupLabels } from './useEmojiGroupLabels';
import { useEmojiGroupIcons } from './useEmojiGroupIcons';
import { preventScrollWithArrowKey, stopPropagation } from '../../utils/keyboard';
import { useRelevantImagePacks } from '../../hooks/useImagePacks';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../hooks/useRecentEmoji';
import { isUserId, mxcUrlToHttp } from '../../utils/matrix';
import { editableActiveElement, targetFromEvent } from '../../utils/dom';
import { useAsyncSearch, UseAsyncSearchOptions } from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { useThrottle } from '../../hooks/useThrottle';
import { addRecentEmoji } from '../../plugins/recent-emoji';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ImagePack, ImageUsage, PackImageReader } from '../../plugins/custom-emoji';
import { getEmoticonSearchStr } from '../../plugins/utils';
import {
  SearchInput,
  EmojiBoardTabs,
  SidebarStack,
  SidebarDivider,
  Sidebar,
  NoStickerPacks,
  createPreviewDataAtom,
  Preview,
  PreviewData,
  EmojiItem,
  StickerItem,
  CustomEmojiItem,
  ImageGroupIcon,
  GroupIcon,
  getEmojiItemInfo,
  EmojiGroup,
  EmojiBoardLayout,
} from './components';
import { EmojiBoardTab, EmojiType } from './types';
import {
  fetchKlipyGifs,
  getGifPreviewPoster,
  getGifPreviewUrl,
  isGifVideoUrl,
  KlipyGif,
} from '../../utils/klipy';
import * as gifCss from '../gif-board/styles.css';
import { VirtualTile } from '../virtualizer';

const RECENT_GROUP_ID = 'recent_group';
const SEARCH_GROUP_ID = 'search_group';

type EmojiGroupItem = {
  id: string;
  name: string;
  items: Array<IEmoji | PackImageReader>;
};
type StickerGroupItem = {
  id: string;
  name: string;
  items: Array<PackImageReader>;
};

const useGroups = (
  tab: EmojiBoardTab,
  imagePacks: ImagePack[],
): [EmojiGroupItem[], StickerGroupItem[]] => {
  const mx = useMatrixClient();

  const recentEmojis = useRecentEmoji(mx, 21);
  const labels = useEmojiGroupLabels();

  const emojiGroupItems = useMemo(() => {
    const g: EmojiGroupItem[] = [];
    if (tab !== EmojiBoardTab.Emoji) return g;

    g.push({
      id: RECENT_GROUP_ID,
      name: 'Recent',
      items: recentEmojis,
    });

    imagePacks.forEach((pack) => {
      let label = pack.meta.name;
      if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

      g.push({
        id: pack.id,
        name: label ?? 'Unknown',
        items: pack
          .getImages(ImageUsage.Emoticon)
          .sort((a, b) => a.shortcode.localeCompare(b.shortcode)),
      });
    });

    emojiGroups.forEach((group) => {
      g.push({
        id: group.id,
        name: labels[group.id],
        items: group.emojis,
      });
    });

    return g;
  }, [mx, recentEmojis, labels, imagePacks, tab]);

  const stickerGroupItems = useMemo(() => {
    const g: StickerGroupItem[] = [];
    if (tab !== EmojiBoardTab.Sticker) return g;

    imagePacks.forEach((pack) => {
      let label = pack.meta.name;
      if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

      g.push({
        id: pack.id,
        name: label ?? 'Unknown',
        items: pack
          .getImages(ImageUsage.Sticker)
          .sort((a, b) => a.shortcode.localeCompare(b.shortcode)),
      });
    });

    return g;
  }, [mx, imagePacks, tab]);

  return [emojiGroupItems, stickerGroupItems];
};

const useItemRenderer = (tab: EmojiBoardTab) => {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const renderItem = (emoji: IEmoji | PackImageReader, index: number) => {
    if ('unicode' in emoji) {
      return <EmojiItem key={emoji.unicode + index} emoji={emoji} />;
    }
    if (tab === EmojiBoardTab.Sticker) {
      return (
        <StickerItem
          key={emoji.shortcode + index}
          mx={mx}
          useAuthentication={useAuthentication}
          image={emoji}
        />
      );
    }
    return (
      <CustomEmojiItem
        key={emoji.shortcode + index}
        mx={mx}
        useAuthentication={useAuthentication}
        image={emoji}
      />
    );
  };

  return renderItem;
};

type EmojiSidebarProps = {
  activeGroupAtom: PrimitiveAtom<string | undefined>;
  packs: ImagePack[];
  onScrollToGroup: (groupId: string) => void;
};
function EmojiSidebar({ activeGroupAtom, packs, onScrollToGroup }: EmojiSidebarProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [activeGroupId, setActiveGroupId] = useAtom(activeGroupAtom);
  const usage = ImageUsage.Emoticon;
  const labels = useEmojiGroupLabels();
  const icons = useEmojiGroupIcons();

  const handleScrollToGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    onScrollToGroup(groupId);
  };

  return (
    <Sidebar>
      <SidebarStack>
        <GroupIcon
          active={activeGroupId === RECENT_GROUP_ID}
          id={RECENT_GROUP_ID}
          label="Recent"
          icon={Icons.RecentClock}
          onClick={handleScrollToGroup}
        />
      </SidebarStack>
      {packs.length > 0 && (
        <SidebarStack>
          <SidebarDivider />
          {packs.map((pack) => {
            let label = pack.meta.name;
            if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

            const url =
              mxcUrlToHttp(mx, pack.getAvatarUrl(usage) ?? '', useAuthentication) ?? undefined;

            return (
              <ImageGroupIcon
                key={pack.id}
                active={activeGroupId === pack.id}
                id={pack.id}
                label={label ?? 'Unknown Pack'}
                url={url}
                onClick={handleScrollToGroup}
              />
            );
          })}
        </SidebarStack>
      )}
      <SidebarStack
        style={{
          position: 'sticky',
          bottom: '-67%',
          zIndex: 1,
        }}
      >
        <SidebarDivider />
        {emojiGroups.map((group) => (
          <GroupIcon
            key={group.id}
            active={activeGroupId === group.id}
            id={group.id}
            label={labels[group.id]}
            icon={icons[group.id]}
            onClick={handleScrollToGroup}
          />
        ))}
      </SidebarStack>
    </Sidebar>
  );
}

type StickerSidebarProps = {
  activeGroupAtom: PrimitiveAtom<string | undefined>;
  packs: ImagePack[];
  onScrollToGroup: (groupId: string) => void;
};
function StickerSidebar({ activeGroupAtom, packs, onScrollToGroup }: StickerSidebarProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [activeGroupId, setActiveGroupId] = useAtom(activeGroupAtom);
  const usage = ImageUsage.Sticker;

  const handleScrollToGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    onScrollToGroup(groupId);
  };

  return (
    <Sidebar>
      <SidebarStack>
        {packs.map((pack) => {
          let label = pack.meta.name;
          if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

          const url =
            mxcUrlToHttp(mx, pack.getAvatarUrl(usage) ?? '', useAuthentication) ?? undefined;

          return (
            <ImageGroupIcon
              key={pack.id}
              active={activeGroupId === pack.id}
              id={pack.id}
              label={label ?? 'Unknown Pack'}
              url={url}
              onClick={handleScrollToGroup}
            />
          );
        })}
      </SidebarStack>
    </Sidebar>
  );
}

type EmojiGroupHolderProps = {
  contentScrollRef: RefObject<HTMLDivElement | null>;
  previewAtom: PrimitiveAtom<PreviewData | undefined>;
  children?: ReactNode;
  onGroupItemClick: MouseEventHandler;
};
function EmojiGroupHolder({
  contentScrollRef,
  previewAtom,
  onGroupItemClick,
  children,
}: EmojiGroupHolderProps) {
  const setPreviewData = useSetAtom(previewAtom);

  const handleEmojiPreview = useCallback(
    (element: HTMLButtonElement) => {
      const emojiInfo = getEmojiItemInfo(element);
      if (!emojiInfo) return;

      setPreviewData({
        key: emojiInfo.data,
        shortcode: emojiInfo.shortcode,
      });
    },
    [setPreviewData],
  );

  const throttleEmojiHover = useThrottle(handleEmojiPreview, {
    wait: 200,
    immediate: true,
  });

  const handleEmojiHover: MouseEventHandler = (evt) => {
    const targetEl = targetFromEvent(evt.nativeEvent, 'button') as HTMLButtonElement | undefined;
    if (!targetEl) return;
    throttleEmojiHover(targetEl);
  };

  const handleEmojiFocus: FocusEventHandler = (evt) => {
    const targetEl = evt.target as HTMLButtonElement;
    handleEmojiPreview(targetEl);
  };

  return (
    <Scroll ref={contentScrollRef} size="400" onKeyDown={preventScrollWithArrowKey} hideTrack>
      <Box
        onClick={onGroupItemClick}
        onMouseMove={handleEmojiHover}
        onFocus={handleEmojiFocus}
        direction="Column"
      >
        {children}
      </Box>
    </Scroll>
  );
}

const DefaultEmojiPreview: PreviewData = { key: '🙂', shortcode: 'slight_smile' };

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};

const VIRTUAL_OVER_SCAN = 2;

type EmojiBoardProps = {
  tab?: EmojiBoardTab;
  onTabChange?: (tab: EmojiBoardTab) => void;
  imagePackRooms: Room[];
  requestClose: () => void;
  returnFocusOnDeactivate?: boolean;
  onEmojiSelect?: (unicode: string, shortcode: string) => void;
  onCustomEmojiSelect?: (mxc: string, shortcode: string) => void;
  onStickerSelect?: (mxc: string, shortcode: string, label: string) => void;
  onGifSelect?: (gif: KlipyGif) => void;
  allowTextCustomEmoji?: boolean;
  addToRecentEmoji?: boolean;
};

export function EmojiBoard({
  tab = EmojiBoardTab.Emoji,
  onTabChange,
  imagePackRooms,
  requestClose,
  returnFocusOnDeactivate,
  onEmojiSelect,
  onCustomEmojiSelect,
  onStickerSelect,
  onGifSelect,
  allowTextCustomEmoji,
  addToRecentEmoji = true,
}: EmojiBoardProps) {
  const mx = useMatrixClient();

  const emojiTab = tab === EmojiBoardTab.Emoji;
  const gifTab = tab === EmojiBoardTab.Gif;
  const usage = emojiTab ? ImageUsage.Emoticon : ImageUsage.Sticker;

  const previewAtom = useMemo(
    () => createPreviewDataAtom(emojiTab ? DefaultEmojiPreview : undefined),
    [emojiTab],
  );
  const activeGroupIdAtom = useMemo(() => atom<string | undefined>(undefined), []);
  const setActiveGroupId = useSetAtom(activeGroupIdAtom);
  const imagePacks = useRelevantImagePacks(usage, imagePackRooms);
  const [emojiGroupItems, stickerGroupItems] = useGroups(tab, imagePacks);
  const groups = emojiTab ? emojiGroupItems : stickerGroupItems;
  const renderItem = useItemRenderer(tab);

  const searchList = useMemo(() => {
    let list: Array<PackImageReader | IEmoji> = [];
    list = list.concat(imagePacks.flatMap((pack) => pack.getImages(usage)));
    if (emojiTab) list = list.concat(emojis);
    return list;
  }, [emojiTab, usage, imagePacks]);

  const [result, search, resetSearch] = useAsyncSearch(
    searchList,
    getEmoticonSearchStr,
    SEARCH_OPTIONS,
  );

  const searchedItems = result?.items.slice(0, 100);

  const handleOnChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
    useCallback(
      (evt) => {
        const term = evt.target.value;
        if (term) search(term);
        else resetSearch();
      },
      [search, resetSearch],
    ),
    { wait: 200 },
  );

  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [gifPage, setGifPage] = useState(1);
  const [gifHasNext, setGifHasNext] = useState(false);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | undefined>();

  const loadGifs = useCallback(async (q: string, p: number, append: boolean) => {
    setGifLoading(true);
    setGifError(undefined);
    try {
      const data = await fetchKlipyGifs(q, p, 24);
      setGifs((prev) => (append ? [...prev, ...data.data] : data.data));
      setGifHasNext(data.has_next);
      setGifPage(data.current_page);
    } catch {
      setGifError('Failed to load GIFs');
    } finally {
      setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gifTab) loadGifs('', 1, false);
  }, [gifTab, loadGifs]);

  const debouncedGifSearch = useDebounce(
    useCallback(
      (q: string) => {
        loadGifs(q, 1, false);
        setGifQuery(q);
      },
      [loadGifs],
    ),
    { wait: 400 },
  );

  const handleGifSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (evt) => {
      const v = evt.target.value;
      setGifQuery(v);
      const trimmed = v.trim();
      debouncedGifSearch(trimmed);
    },
    [debouncedGifSearch],
  );

  const handleGifLoadMore = useCallback(() => {
    loadGifs(gifQuery.trim(), gifPage + 1, true);
  }, [loadGifs, gifQuery, gifPage]);

  const handleGifSelect = useCallback(
    (gif: KlipyGif) => {
      onGifSelect?.(gif);
      requestClose();
    },
    [onGifSelect, requestClose],
  );

  const contentScrollRef = useRef<HTMLDivElement>(null);
  const virtualBaseRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => contentScrollRef.current,
    estimateSize: () => 40,
    overscan: VIRTUAL_OVER_SCAN,
  });
  const vItems = virtualizer.getVirtualItems();

  const handleGroupItemClick: MouseEventHandler = (evt) => {
    const targetEl = targetFromEvent(evt.nativeEvent, 'button');
    const emojiInfo = targetEl && getEmojiItemInfo(targetEl);
    if (!emojiInfo) return;

    if (emojiInfo.type === EmojiType.Emoji) {
      onEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
      if (!evt.altKey && !evt.shiftKey && addToRecentEmoji) {
        addRecentEmoji(mx, emojiInfo.data);
      }
    }
    if (emojiInfo.type === EmojiType.CustomEmoji) {
      onCustomEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
    }
    if (emojiInfo.type === EmojiType.Sticker) {
      onStickerSelect?.(emojiInfo.data, emojiInfo.shortcode, emojiInfo.label);
    }
    if (!evt.altKey && !evt.shiftKey) requestClose();
  };

  const handleTextCustomEmojiSelect = (textEmoji: string) => {
    onCustomEmojiSelect?.(textEmoji, textEmoji);
    requestClose();
  };

  const handleScrollToGroup = (groupId: string) => {
    const groupIndex = groups.findIndex((group) => group.id === groupId);
    virtualizer.scrollToIndex(groupIndex, { align: 'start' });
  };

  useEffect(() => {
    const scrollElement = contentScrollRef.current;
    if (scrollElement) {
      const scrollTop = scrollElement.offsetTop + scrollElement.scrollTop;
      const offsetTop = virtualBaseRef.current?.offsetTop ?? 0;
      const inViewVItem = vItems.find((vItem) => scrollTop < offsetTop + vItem.end);

      const group = inViewVItem ? groups[inViewVItem?.index] : undefined;
      setActiveGroupId(group?.id);
    }
  }, [vItems, groups, setActiveGroupId, result?.query]);

  useEffect(() => {
    const scrollElement = contentScrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTo({ top: 0 });
    }
  }, [result?.query]);

  useEffect(() => {
    if (groups.length > 0) {
      virtualizer.scrollToIndex(0, { align: 'start' });
    }
  }, [tab, virtualizer, groups]);

  return (
    <FocusTrap
      focusTrapOptions={{
        returnFocusOnDeactivate,
        initialFocus: false,
        onDeactivate: requestClose,
        clickOutsideDeactivates: true,
        allowOutsideClick: true,
        isKeyForward: (evt: KeyboardEvent) =>
          !editableActiveElement() && isKeyHotkey(['arrowdown', 'arrowright'], evt),
        isKeyBackward: (evt: KeyboardEvent) =>
          !editableActiveElement() && isKeyHotkey(['arrowup', 'arrowleft'], evt),
        escapeDeactivates: stopPropagation,
      }}
    >
      <EmojiBoardLayout
        header={
          <Box direction="Column" gap="200">
            {onTabChange && <EmojiBoardTabs tab={tab} onTabChange={onTabChange} />}
            <SearchInput
              key={tab}
              query={gifTab ? gifQuery : result?.query}
              onChange={gifTab ? handleGifSearchChange : handleOnChange}
              allowTextCustomEmoji={gifTab ? false : allowTextCustomEmoji}
              onTextCustomEmojiSelect={handleTextCustomEmojiSelect}
              placeholder={gifTab ? 'Search on Klipy' : undefined}
            />
          </Box>
        }
        sidebar={
          emojiTab ? (
            <EmojiSidebar
              activeGroupAtom={activeGroupIdAtom}
              packs={imagePacks}
              onScrollToGroup={handleScrollToGroup}
            />
          ) : undefined
        }
      >
        {gifTab ? (
          <Box grow="Yes" direction="Column" style={{ minHeight: 0 }}>
            <Scroll size="400" hideTrack>
              <Box
                direction="Column"
                gap="200"
                style={{ padding: `${config.space.S200} ${config.space.S200} 0` }}
              >
                {gifError && (
                  <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                    <Text size="T300" priority="300">
                      {gifError}
                    </Text>
                  </Box>
                )}
                <div className={gifCss.Grid}>
                  {gifs.map((gif) => {
                    const preview = getGifPreviewUrl(gif);
                    const poster = getGifPreviewPoster(gif);
                    const isVideo = isGifVideoUrl(preview);
                    return (
                      <button
                        key={gif.id}
                        type="button"
                        className={gifCss.GifItem}
                        onClick={() => handleGifSelect(gif)}
                        aria-label={gif.title}
                      >
                        {isVideo ? (
                          <video
                            className={gifCss.GifImg}
                            src={preview}
                            poster={poster || undefined}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            className={gifCss.GifImg}
                            src={preview}
                            alt={gif.title}
                            loading="lazy"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {gifLoading && (
                  <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                    <Spinner size="300" variant="Secondary" fill="Soft" />
                  </Box>
                )}
                {!gifLoading && gifs.length === 0 && !gifError && (
                  <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                    <Text size="T300">No GIFs found</Text>
                  </Box>
                )}
                {gifHasNext && !gifLoading && (
                  <Box justifyContent="Center" style={{ padding: config.space.S200 }}>
                    <Button variant="Secondary" size="300" radii="300" onClick={handleGifLoadMore}>
                      <Text size="B300">Load more</Text>
                    </Button>
                  </Box>
                )}
              </Box>
            </Scroll>
          </Box>
        ) : (
          <>
            <Box grow="Yes">
              <EmojiGroupHolder
                key={tab}
                contentScrollRef={contentScrollRef}
                previewAtom={previewAtom}
                onGroupItemClick={handleGroupItemClick}
              >
                {searchedItems && (
                  <EmojiGroup
                    id={SEARCH_GROUP_ID}
                    label={searchedItems.length ? 'Search Results' : 'No Results found'}
                  >
                    {searchedItems.map(renderItem)}
                  </EmojiGroup>
                )}
                <div
                  ref={virtualBaseRef}
                  style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                  }}
                >
                  {vItems.map((vItem) => {
                    const group = groups[vItem.index];

                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        style={{ paddingTop: config.space.S200 }}
                        ref={virtualizer.measureElement}
                        key={vItem.index}
                      >
                        <EmojiGroup key={group.id} id={group.id} label={group.name}>
                          {group.items.map(renderItem)}
                        </EmojiGroup>
                      </VirtualTile>
                    );
                  })}
                </div>
                {tab === EmojiBoardTab.Sticker && groups.length === 0 && <NoStickerPacks />}
              </EmojiGroupHolder>
            </Box>
            <Preview previewAtom={previewAtom} />
          </>
        )}
      </EmojiBoardLayout>
    </FocusTrap>
  );
}
