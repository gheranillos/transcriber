import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createVideoUrlStore } from '../src/background/videoUrlStore.js';

describe('videoUrlStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when no URL has been captured for a tab', () => {
    const store = createVideoUrlStore();
    expect(store.getVideoUrl(1)).toBeNull();
  });

  it('returns the captured URL for a tab', () => {
    const store = createVideoUrlStore();
    store.setVideoUrl(1, 'https://cdn.example.com/video.mp4');
    expect(store.getVideoUrl(1)).toBe('https://cdn.example.com/video.mp4');
  });

  it('does not mix up URLs between different tabs', () => {
    const store = createVideoUrlStore();
    store.setVideoUrl(1, 'https://cdn.example.com/a.mp4');
    store.setVideoUrl(2, 'https://cdn.example.com/b.mp4');
    expect(store.getVideoUrl(1)).toBe('https://cdn.example.com/a.mp4');
    expect(store.getVideoUrl(2)).toBe('https://cdn.example.com/b.mp4');
  });

  it('expires a URL older than maxAgeMs', () => {
    const store = createVideoUrlStore();
    store.setVideoUrl(1, 'https://cdn.example.com/a.mp4');
    vi.advanceTimersByTime(31000);
    expect(store.getVideoUrl(1, 30000)).toBeNull();
  });

  it('clearTab removes the stored URL', () => {
    const store = createVideoUrlStore();
    store.setVideoUrl(1, 'https://cdn.example.com/a.mp4');
    store.clearTab(1);
    expect(store.getVideoUrl(1)).toBeNull();
  });
});
