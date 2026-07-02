const VIDEO_URL_HINTS = ['.mp4', 'cdninstagram.com', 'fbcdn.net', 'tiktokcdn', 'tiktokv.com'];

export function isVideoRequestUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.toLowerCase();
  return VIDEO_URL_HINTS.some((hint) => lower.includes(hint));
}
