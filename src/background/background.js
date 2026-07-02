import { createVideoUrlStore } from './videoUrlStore.js';
import { isVideoRequestUrl } from './videoRequestMatcher.js';
import { MessageType, MessageTarget } from '../shared/messages.js';

const videoUrlStore = createVideoUrlStore();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId >= 0 && isVideoRequestUrl(details.url)) {
      console.debug('[ITTX] video URL capturado', details.url);
      videoUrlStore.setVideoUrl(details.tabId, details.url);
    }
  },
  {
    urls: [
      '*://*.cdninstagram.com/*',
      '*://*.fbcdn.net/*',
      '*://*.tiktokcdn.com/*',
      '*://*.tiktokcdn-us.com/*',
      '*://*.tiktokv.com/*',
    ],
  },
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== MessageTarget.BACKGROUND) return false;

  if (message.type === MessageType.GET_VIDEO_URL) {
    const tabId = sender.tab?.id;
    sendResponse({ url: tabId != null ? videoUrlStore.getVideoUrl(tabId) : null });
    return false;
  }

  return false;
});
