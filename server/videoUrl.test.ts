import { describe, expect, it } from 'vitest';
import { getVideoSource, isValidMediaUrl } from '../shared/videoUrl';

describe('getVideoSource', () => {
  it('converts Vimeo links', () => {
    expect(getVideoSource('https://vimeo.com/123456789')).toEqual({ kind: 'vimeo', embedUrl: 'https://player.vimeo.com/video/123456789' });
  });
  it('converts YouTube links', () => {
    expect(getVideoSource('https://youtu.be/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
  });
  it('keeps local and external files playable', () => {
    expect(getVideoSource('/media/client.mp4')).toEqual({ kind: 'file', url: '/media/client.mp4' });
    expect(getVideoSource('https://cdn.example.com/client.webm?token=1')?.kind).toBe('file');
  });
  it('rejects unsafe or unsupported links', () => {
    expect(getVideoSource('javascript:alert(1)')).toBeNull();
    expect(getVideoSource('http://vimeo.com/123456789')).toBeNull();
    expect(getVideoSource('https://example.com/page')).toBeNull();
    expect(isValidMediaUrl('https://example.com/photo.jpg', 'image')).toBe(true);
  });
});
