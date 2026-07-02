import { describe, it, expect } from 'vitest';
import { isVideoRequestUrl } from '../src/background/videoRequestMatcher.js';

describe('isVideoRequestUrl', () => {
  it('matches an Instagram CDN mp4 URL', () => {
    expect(isVideoRequestUrl('https://scontent.cdninstagram.com/v/xyz.mp4?foo=bar')).toBe(true);
  });

  it('matches a TikTok CDN URL', () => {
    expect(isVideoRequestUrl('https://v16-webapp.tiktokcdn.com/abc123/')).toBe(true);
  });

  it('does not match an unrelated URL', () => {
    expect(isVideoRequestUrl('https://www.instagram.com/api/graphql')).toBe(false);
  });

  it('does not match an empty or missing URL', () => {
    expect(isVideoRequestUrl('')).toBe(false);
    expect(isVideoRequestUrl(undefined)).toBe(false);
  });
});
