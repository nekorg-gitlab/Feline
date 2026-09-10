import React, { FormEventHandler, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Text, Input, Icon, Icons, Spinner, Chip, config } from 'folds';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

type SearchProps = {
  active?: boolean;
  loading?: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  onSearch: (term: string) => void;
  onReset: () => void;
};
export function SearchInput({ active, loading, searchInputRef, onSearch, onReset }: SearchProps) {
  const { t } = useTranslation();
  // Auto-focus pops the Android keyboard and shifts layout; let the user tap.
  const autoFocus = useScreenSizeContext() !== ScreenSize.Mobile;
  const handleSearchSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { searchInput } = evt.target as HTMLFormElement & {
      searchInput: HTMLInputElement;
    };

    const searchTerm = searchInput.value.trim() || undefined;
    if (searchTerm) {
      onSearch(searchTerm);
    }
  };

  return (
    <Box as="form" direction="Column" gap="100" onSubmit={handleSearchSubmit}>
      <span data-spacing-node />
      <Text size="L400">{t('Common.searchLabel')}</Text>
      <Input
        ref={searchInputRef}
        style={{ paddingRight: config.space.S300 }}
        name="searchInput"
        autoFocus={autoFocus}
        size="500"
        variant="Background"
        placeholder={t('Common.searchForKeyword')}
        autoComplete="off"
        before={
          active && loading ? (
            <Spinner variant="Secondary" size="200" />
          ) : (
            <Icon size="200" src={Icons.Search} />
          )
        }
        after={
          active ? (
            <Chip
              key="resetButton"
              type="reset"
              variant="Secondary"
              size="400"
              radii="Pill"
              outlined
              after={<Icon size="50" src={Icons.Cross} />}
              onClick={onReset}
            >
              <Text size="B300">{t('Common.clear')}</Text>
            </Chip>
          ) : (
            <Chip type="submit" variant="Primary" size="400" radii="Pill" outlined>
              <Text size="B300">{t('Common.enter')}</Text>
            </Chip>
          )
        }
      />
    </Box>
  );
}
