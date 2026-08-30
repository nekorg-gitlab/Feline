import React from 'react';
import { Box, Text } from 'folds';
import * as css from './styles.css';
import { VERSION_DISPLAY } from '../../../version';

export function AuthFooter() {
  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
      <Text
        as="a"
        size="T300"
        href="https://github.com/ajbura/feline/releases"
        target="_blank"
        rel="noreferrer"
      >
        {VERSION_DISPLAY}
      </Text>
      <Text
        as="a"
        size="T300"
        href="https://twitter.com/felineapp"
        target="_blank"
        rel="noreferrer"
      >
        Twitter
      </Text>
      <Text as="a" size="T300" href="https://matrix.org" target="_blank" rel="noreferrer">
        Powered by Matrix
      </Text>
    </Box>
  );
}
