import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildDownloadFilename } from '../src/shared/downloadUtils.js';

describe('buildDownloadFilename', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a filename ending in .mp4', () => {
    expect(buildDownloadFilename()).toMatch(/\.mp4$/);
  });

  it('includes a numeric timestamp for uniqueness', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    expect(buildDownloadFilename()).toBe('ittx-video-1234567890.mp4');
  });

  it('allows a custom prefix', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1);
    expect(buildDownloadFilename('reel')).toBe('reel-1.mp4');
  });
});
