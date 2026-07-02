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
  const article = video.closest('article');
  if (!article) return null;

  const likeButton = article.querySelector('svg[aria-label="Me gusta"], svg[aria-label="Like"]');
  if (!likeButton) return null;

  return likeButton.closest('.action-bar') || likeButton.parentElement;
}
