import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Icon, IconButton, Icons, Input, Scroll, Spinner, Text, config } from 'folds';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { editableActiveElement } from '../../utils/dom';
import { stopPropagation } from '../../utils/keyboard';
import { useDebounce } from '../../hooks/useDebounce';
import {
  fetchKlipyGifs,
  getGifPreviewPoster,
  getGifPreviewUrl,
  isGifVideoUrl,
  KlipyGif,
} from '../../utils/klipy';
import * as css from './styles.css';

type GifBoardProps = {
  onGifSelect: (gif: KlipyGif) => void;
  requestClose: () => void;
};

export function GifBoard({ onGifSelect, requestClose }: GifBoardProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async (q: string, p: number, append: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await fetchKlipyGifs(q, p, 24);
      setGifs((prev) => (append ? [...prev, ...data.data] : data.data));
      setHasNext(data.has_next);
      setPage(data.current_page);
    } catch {
      setError('Failed to load GIFs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('', 1, false);
  }, [load]);

  const debouncedSearch = useDebounce(
    useCallback(
      (q: string) => {
        load(q, 1, false);
      },
      [load],
    ),
    { wait: 400 },
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    debouncedSearch(v.trim());
  };

  const handleLoadMore = () => {
    load(query.trim(), page + 1, true);
  };

  return (
    <FocusTrap
      focusTrapOptions={{
        returnFocusOnDeactivate: false,
        initialFocus: false,
        onDeactivate: requestClose,
        clickOutsideDeactivates: true,
        allowOutsideClick: true,
        escapeDeactivates: stopPropagation,
        isKeyForward: (evt: KeyboardEvent) =>
          !editableActiveElement() && isKeyHotkey(['arrowdown', 'arrowright'], evt),
        isKeyBackward: (evt: KeyboardEvent) =>
          !editableActiveElement() && isKeyHotkey(['arrowup', 'arrowleft'], evt),
      }}
    >
      <Box direction="Column" gap="200" className={css.Base}>
        <Box direction="Column" gap="200" className={css.Header}>
          <Box gap="200" alignItems="Center" style={{ width: '100%' }}>
            <Box grow="Yes" style={{ minWidth: 0 }}>
              <Input
                autoFocus
                placeholder="Search on Klipy"
                value={query}
                onChange={handleChange}
                before={<Icon size="200" src={Icons.Search} />}
                after={
                  query ? (
                    <IconButton
                      size="300"
                      variant="SurfaceVariant"
                      radii="300"
                      onClick={() => {
                        setQuery('');
                        load('', 1, false);
                      }}
                    >
                      <Icon size="100" src={Icons.Cross} />
                    </IconButton>
                  ) : undefined
                }
                style={{ width: '100%' }}
              />
            </Box>
          </Box>
        </Box>

        <Scroll size="400" hideTrack>
          <Box
            direction="Column"
            gap="200"
            style={{ padding: `${config.space.S200} ${config.space.S200} 0` }}
          >
            {error && (
              <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                <Text size="T300" priority="300">
                  {error}
                </Text>
              </Box>
            )}

            <div className={css.Grid}>
              {gifs.map((gif) => {
                const preview = getGifPreviewUrl(gif);
                const poster = getGifPreviewPoster(gif);
                const isVideo = isGifVideoUrl(preview);
                return (
                  <button
                    key={gif.id}
                    type="button"
                    className={css.GifItem}
                    onClick={() => {
                      onGifSelect(gif);
                      requestClose();
                    }}
                    aria-label={gif.title}
                  >
                    {isVideo ? (
                      <video
                        className={css.GifImg}
                        src={preview}
                        poster={poster || undefined}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img className={css.GifImg} src={preview} alt={gif.title} loading="lazy" />
                    )}
                  </button>
                );
              })}
            </div>

            {loading && (
              <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                <Spinner size="300" variant="Secondary" fill="Soft" />
              </Box>
            )}

            {!loading && gifs.length === 0 && !error && (
              <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                <Text size="T300">No GIFs found</Text>
              </Box>
            )}

            {hasNext && !loading && (
              <Box justifyContent="Center" style={{ padding: config.space.S200 }}>
                <Button variant="Secondary" size="300" radii="300" onClick={handleLoadMore}>
                  <Text size="B300">Load more</Text>
                </Button>
              </Box>
            )}
          </Box>
        </Scroll>
      </Box>
    </FocusTrap>
  );
}
