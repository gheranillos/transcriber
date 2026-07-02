import { describe, it, expect, beforeEach } from 'vitest';
import { findUnprocessedVideoPosts, markAsProcessed, findActionBar } from '../src/content/tiktokDetector.js';

function renderPost({ withVideo = true, withLikeButton = true } = {}) {
  document.body.innerHTML = `
    <div data-e2e="video-container">
      ${withVideo ? '<video src="blob:fake"></video>' : ''}
      <div data-e2e="action-bar">
        ${withLikeButton ? '<button aria-label="Like video"></button>' : ''}
      </div>
    </div>
  `;
}

describe('tiktokDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds a video post that has not been processed yet', () => {
    renderPost();
    expect(findUnprocessedVideoPosts().length).toBe(1);
  });

  it('ignores posts without a video element', () => {
    renderPost({ withVideo: false });
    expect(findUnprocessedVideoPosts().length).toBe(0);
  });

  it('does not return a video already marked as processed', () => {
    renderPost();
    const [video] = findUnprocessedVideoPosts();
    markAsProcessed(video);
    expect(findUnprocessedVideoPosts().length).toBe(0);
  });

  it('finds the action bar containing the like button', () => {
    renderPost();
    const [video] = findUnprocessedVideoPosts();
    const actionBar = findActionBar(video);
    expect(actionBar).not.toBeNull();
    expect(actionBar.querySelector('button[aria-label="Like video"]')).not.toBeNull();
  });

  it('returns null when no action bar can be found', () => {
    renderPost({ withLikeButton: false });
    const [video] = findUnprocessedVideoPosts();
    expect(findActionBar(video)).toBeNull();
  });
});
