import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

export type PendingGif = {
  id: string;
  txnId: string;
  previewUrl: string;
  poster?: string;
  w: number;
  h: number;
  title: string;
  ts: number;
};

export const pendingGifsAtomFamily = atomFamily((roomId: string) => atom<PendingGif[]>([]));
