export type EmbedType = 'youtube' | 'spotify' | 'gif';

export type YouTubeEmbed = {
  type: 'youtube';
  url: string;
  videoId: string;
  embedUrl: string;
};

export type SpotifyEmbed = {
  type: 'spotify';
  url: string;
  embedUrl: string;
  kind: 'track' | 'album' | 'playlist' | 'artist' | 'episode' | 'show';
  id: string;
};

export type GifEmbed = {
  type: 'gif';
  url: string;
  mediaUrl: string;
  kind: 'direct' | 'tenor' | 'giphy';
};

export type EmbedData = YouTubeEmbed | SpotifyEmbed | GifEmbed;

export const ALLOWED_FRAME_SRC = ['https://www.youtube-nocookie.com', 'https://open.spotify.com'];

export const CSP_FRAME_SRC = ALLOWED_FRAME_SRC.join(' ');

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function tryParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function parseYouTubeId(rawUrl: string): string | null {
  const url = tryParseUrl(rawUrl);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname;

  if (host === 'youtu.be') {
    const id = pathname.split('/').filter(Boolean)[0];
    if (id && YOUTUBE_ID_RE.test(id)) return id;
    return null;
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    if (pathname === '/watch') {
      const v = url.searchParams.get('v');
      if (v && YOUTUBE_ID_RE.test(v)) return v;
      return null;
    }

    const parts = pathname.split('/').filter(Boolean);

    if (parts.length >= 2 && (parts[0] === 'shorts' || parts[0] === 'embed')) {
      const id = parts[1];
      if (id && YOUTUBE_ID_RE.test(id)) return id;
    }

    if (parts.length >= 2 && parts[0] === 'live') {
      const id = parts[1];
      if (id && YOUTUBE_ID_RE.test(id)) return id;
    }

    if (parts.length === 1 && YOUTUBE_ID_RE.test(parts[0])) {
      return parts[0];
    }
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function parseYouTube(rawUrl: string): YouTubeEmbed | null {
  const videoId = parseYouTubeId(rawUrl);
  if (!videoId) return null;
  return {
    type: 'youtube',
    url: rawUrl,
    videoId,
    embedUrl: getYouTubeEmbedUrl(videoId),
  };
}

const SPOTIFY_KINDS = new Set(['track', 'album', 'playlist', 'artist', 'episode', 'show']);
const SPOTIFY_ID_RE = /^[a-zA-Z0-9]{22}$/;

export function parseSpotify(rawUrl: string): SpotifyEmbed | null {
  const url = tryParseUrl(rawUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'open.spotify.com' && host !== 'spotify.com') return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const kind = parts[0].toLowerCase();
  const idRaw = parts[1];
  if (!SPOTIFY_KINDS.has(kind)) return null;

  const id = idRaw.split('?')[0].split('#')[0];
  if (!SPOTIFY_ID_RE.test(id) && !/^[a-zA-Z0-9]+$/.test(id)) return null;

  const typedKind = kind as SpotifyEmbed['kind'];
  return {
    type: 'spotify',
    url: rawUrl,
    kind: typedKind,
    id,
    embedUrl: `https://open.spotify.com/embed/${typedKind}/${id}`,
  };
}

const DIRECT_GIF_EXT_RE = /\.(gif|webp|mp4|webm)(\?.*)?$/i;

export function parseGif(rawUrl: string): GifEmbed | null {
  const url = tryParseUrl(rawUrl);
  if (!url) return null;

  const href = url.href;

  if (DIRECT_GIF_EXT_RE.test(url.pathname)) {
    return {
      type: 'gif',
      url: href,
      mediaUrl: href,
      kind: 'direct',
    };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'tenor.com' || host === 'media.tenor.com' || host.endsWith('.tenor.com')) {
    return {
      type: 'gif',
      url: href,
      mediaUrl: href,
      kind: 'tenor',
    };
  }

  if (host === 'giphy.com' || host.endsWith('.giphy.com') || host === 'media.giphy.com') {
    return {
      type: 'gif',
      url: href,
      mediaUrl: href,
      kind: 'giphy',
    };
  }

  return null;
}

export function parseEmbed(rawUrl: string): EmbedData | null {
  return parseYouTube(rawUrl) ?? parseSpotify(rawUrl) ?? parseGif(rawUrl);
}

export function getEmbedsForUrls(urls: string[]): EmbedData[] {
  const seen = new Set<string>();
  const result: EmbedData[] = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    const embed = parseEmbed(u);
    if (embed) result.push(embed);
  }
  return result;
}
