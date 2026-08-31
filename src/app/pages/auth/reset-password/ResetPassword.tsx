import { Box, Button, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { Link } from 'react-router-dom';
import { getLoginPath } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';

export function ResetPassword() {
  const { t } = useTranslation();
  const server = useAuthServer();

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        {t('Common.resetPassword')}
      </Text>
      <Text size="T300" priority="300">
        {t('UI.passwordLoginHasBeenDisabledPleaseUseSso')}
      </Text>
      <Button as={Link} to={getLoginPath(server)} size="500" variant="Primary">
        <Text as="span" size="B500">
          {t('Common.backToLogin')}
        </Text>
      </Button>
      <Text align="Center" size="T200">
        <Link to={getLoginPath(server)}>Login with SSO</Link>
      </Text>
    </Box>
  );
}
