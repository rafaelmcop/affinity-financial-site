export type VideoSource =
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'vimeo'; embedUrl: string }
  | { kind: 'file'; url: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d+$/;
const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i;

export function getVideoSource(rawValue: string): VideoSource | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (value.startsWith('/media/') && VIDEO_FILE.test(value.split('?')[0])) return { kind: 'file', url: value };

  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  let youtubeId: string | null = null;
  if (host === 'youtu.be') youtubeId = parts[0] ?? null;
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') youtubeId = url.searchParams.get('v');
    if (['embed', 'shorts', 'live'].includes(parts[0])) youtubeId = parts[1] ?? null;
  }
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}` };

  let vimeoId: string | null = null;
  if (host === 'vimeo.com') vimeoId = [...parts].reverse().find(part => VIMEO_ID.test(part)) ?? null;
  if (host === 'player.vimeo.com' && parts[0] === 'video') vimeoId = parts[1] ?? null;
  if (vimeoId && VIMEO_ID.test(vimeoId)) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}` };

  if (VIDEO_FILE.test(url.pathname)) return { kind: 'file', url: url.toString() };
  return null;
}

export function isValidMediaUrl(rawValue: string, mediaType: 'image' | 'video') {
  const value = rawValue.trim();
  if (!value) return true;
  if (mediaType === 'video') return getVideoSource(value) !== null;
  if (value.startsWith('/media/')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
