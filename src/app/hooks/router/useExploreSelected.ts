import { useMatch, useParams } from 'react-router-dom';
import { decodePathParam, getExplorePath } from '../../pages/pathUtils';

export const useExploreSelected = (): boolean => {
  const match = useMatch({
    path: getExplorePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useExploreServer = (): string | undefined => {
  const { server: rawServer } = useParams();
  const server = rawServer ? decodePathParam(rawServer) : undefined;

  return server;
};
