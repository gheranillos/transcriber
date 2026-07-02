export function createVideoUrlStore() {
  const entries = new Map();

  return {
    setVideoUrl(tabId, url) {
      entries.set(tabId, { url, timestamp: Date.now() });
    },
    getVideoUrl(tabId, maxAgeMs = 30000) {
      const entry = entries.get(tabId);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > maxAgeMs) return null;
      return entry.url;
    },
    clearTab(tabId) {
      entries.delete(tabId);
    },
  };
}
