import React from 'react';
import { useNavigate } from 'react-router-dom';
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

  return <Support requestClose={handleClose} />;
}
