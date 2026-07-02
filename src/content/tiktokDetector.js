const PROCESSED_ATTR = 'data-ittx-processed';

export function findUnprocessedVideoPosts(root = document) {
  return Array.from(root.querySelectorAll('video')).filter(
    (video) => !video.hasAttribute(PROCESSED_ATTR),
  );
}

export function markAsProcessed(video) {
  video.setAttribute(PROCESSED_ATTR, 'true');
}

export function findActionBar(video) {
  const container = video.closest('[data-e2e="video-container"]');
  if (!container) return null;

  const likeButton = container.querySelector('button[aria-label="Like video"]');
  if (!likeButton) return null;

  return likeButton.closest('[data-e2e="action-bar"]') || likeButton.parentElement;
}
