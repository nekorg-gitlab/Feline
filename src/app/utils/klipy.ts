export const KLIPY_API_KEY = 'Bo2pRLFEa6fuoya6cUBTfY7wiwKWoaCchJiyyJwrm76yPKq8WHxZgo1ABQiWz8i2';

export const KLIPY_BASE_URL = 'https://api.klipy.com/api/v1';

export type KlipyFileVariant = {
  url: string;
  width: number;
  height: number;
  size: number;
};

export type KlipyFile = {
  hd: Record<string, KlipyFileVariant>;
  md: Record<string, KlipyFileVariant>;
  sm: Record<string, KlipyFileVariant>;
  xs: Record<string, KlipyFileVariant>;
};

export type KlipyGif = {
  id: number;
  slug: string;
  title: string;
  file: KlipyFile;
  tags: string[];
};

type KlipyPaginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  has_next: boolean;
};

type KlipyResponse<T> = {
  result: boolean;
  data: KlipyPaginated<T>;
};

const buildUrl = (path: string, params: Record<string, string | number | undefined>) => {
  const url = new URL(`${KLIPY_BASE_URL}/${KLIPY_API_KEY}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  });
  return url.toString();
};

export const fetchKlipyGifs = async (
  q: string,
  page = 1,
  perPage = 24,
): Promise<KlipyPaginated<KlipyGif>> => {
  const url = q
    ? buildUrl('/gifs/search', { q, page, per_page: perPage })
    : buildUrl('/gifs/trending', { page, per_page: perPage });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Klipy error ${res.status}`);
  const json = (await res.json()) as KlipyResponse<KlipyGif>;
  return json.data;
};

export const getGifPreviewUrl = (gif: KlipyGif): string =>
  gif.file.sm.webp?.url ??
  gif.file.md.webp?.url ??
  gif.file.sm.gif?.url ??
  gif.file.md.gif?.url ??
  gif.file.xs.gif?.url ??
  gif.file.sm.mp4?.url ??
  '';

export const getGifPreviewPoster = (gif: KlipyGif): string =>
  gif.file.sm.jpg?.url ?? gif.file.md.jpg?.url ?? '';

export const getGifContentUrl = (gif: KlipyGif): string =>
  gif.file.hd.mp4?.url ??
  gif.file.md.mp4?.url ??
  gif.file.hd.webm?.url ??
  gif.file.md.webm?.url ??
  gif.file.hd.gif?.url ??
  gif.file.md.gif?.url ??
  gif.file.sm.gif?.url ??
  '';

export const isGifVideoUrl = (url: string): boolean =>
  url.endsWith('.mp4') || url.endsWith('.webm');

export const getGifDimensions = (gif: KlipyGif): { w: number; h: number } => {
  const v =
    gif.file.hd.mp4 ??
    gif.file.md.mp4 ??
    gif.file.hd.gif ??
    gif.file.md.gif ??
    gif.file.sm.gif ??
    gif.file.hd.gif;
  return v ? { w: v.width, h: v.height } : { w: 320, h: 320 };
};
