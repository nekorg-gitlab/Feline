import { Box, Button, Text } from 'folds';
import React from 'react';
import { Link } from 'react-router-dom';
import { getLoginPath } from '../../pathUtils';
import { useAuthServer } from '../../../hooks/useAuthServer';

export function ResetPassword() {
  const server = useAuthServer();

  return (
    <Box direction="Column" gap="500">
      <Text size="H2" priority="400">
        Reset Password
      </Text>
      <Text size="T300" priority="300">
        Password login has been disabled. Please use SSO to authenticate. If you need to reset your
        password, please do so via your SSO provider.
      </Text>
      <Button as={Link} to={getLoginPath(server)} size="500" variant="Primary">
        <Text as="span" size="B500">
          Back to Login
        </Text>
      </Button>
      <Text align="Center" size="T200">
        <Link to={getLoginPath(server)}>Login with SSO</Link>
      </Text>
    </Box>
  );
}
