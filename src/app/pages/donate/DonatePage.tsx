import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from 'folds';
import { Support } from '../../features/settings/support';
import { getHomePath, getLoginPath } from '../pathUtils';
import { getFallbackSession } from '../../state/sessions';

export function DonatePage() {
  const navigate = useNavigate();

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const session = getFallbackSession();
      if (session) navigate(getHomePath());
      else navigate(getLoginPath());
    }
  };

  return (
    <Box
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--bg-surface)',
      }}
    >
      <Box
        style={{
          width: '100%',
          maxWidth: '720px',
          height: '100%',
          boxShadow: 'var(--elevation-400)',
        }}
      >
        <Support requestClose={handleClose} />
      </Box>
    </Box>
  );
}
