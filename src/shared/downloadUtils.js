export function buildDownloadFilename(prefix = 'ittx-video') {
  return `${prefix}-${Date.now()}.mp4`;
}
