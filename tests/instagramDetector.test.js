import { describe, it, expect, beforeEach } from 'vitest';
import { findUnprocessedVideoPosts, markAsProcessed, findActionBar } from '../src/content/instagramDetector.js';

function renderPost({ withVideo = true, withLikeButton = true } = {}) {
  document.body.innerHTML = `
    <article>
      ${withVideo ? '<video src="blob:fake"></video>' : ''}
      <div class="action-bar">
        ${withLikeButton ? '<svg aria-label="Me gusta"></svg>' : ''}
      </div>
    </article>
  `;
}

describe('instagramDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds a video post that has not been processed yet', () => {
    renderPost();
    const videos = findUnprocessedVideoPosts();
    expect(videos.length).toBe(1);
  });

  it('ignores posts without a video element', () => {
    renderPost({ withVideo: false });
    const videos = findUnprocessedVideoPosts();
    expect(videos.length).toBe(0);
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
    expect(actionBar.querySelector('svg[aria-label="Me gusta"]')).not.toBeNull();
  });

  it('returns null when no action bar can be found', () => {
    renderPost({ withLikeButton: false });
    const [video] = findUnprocessedVideoPosts();
    expect(findActionBar(video)).toBeNull();
  });
});
