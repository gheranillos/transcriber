# IG/TikTok Transcriptor y Descargador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension that adds "transcribir" and "descargar" buttons to video posts on Instagram and TikTok, transcribing audio locally with Whisper (no API key, no server) and downloading the original video file.

**Architecture:** A content script injects buttons into the feed and drives the UI; a background service worker captures real video CDN URLs via `chrome.webRequest` and relays messages; an offscreen document runs the Whisper model (via `@xenova/transformers`) since MV3 service workers can't do heavy WASM/ML work directly. Backend pieces (URL capture, download, transcription pipeline) are built and tested first; the content-script UI is wired to them last, once all handlers are real.

**Tech Stack:** Vanilla JS (no framework), esbuild for bundling, Vitest + jsdom for unit tests, `@xenova/transformers` (Whisper `Xenova/whisper-base`) for local speech-to-text, Chrome Manifest V3 APIs (`webRequest`, `downloads`, `offscreen`).

## Global Constraints

- Chrome Manifest V3 only. No `<all_urls>` — host permissions scoped to exact domains needed.
- Transcription is forced to Spanish (`language: "spanish"`, `task: "transcribe"`) — no language auto-detection.
- Download is video-only (`.mp4`); no separate transcript export file is generated (transcript is copy-to-clipboard only).
- Instagram Stories are out of scope; only feed posts/Reels containing a `<video>` element are supported.
- No timestamps in the transcript output.
- Transcription model is `Xenova/whisper-base` via `@xenova/transformers`, running 100% locally in the browser — no external API, no API key, no cost.
- Build tooling requires Node.js v18+. Tests use Vitest with the `jsdom` environment.
- Personal-use tool for content the user can already view publicly — no bulk scraping features.

---

## File Structure

```
transcription app/
├── manifest.json
├── offscreen.html
├── package.json
├── esbuild.config.js
├── vitest.config.js
├── styles/
│   └── content.css
├── src/
│   ├── shared/
│   │   ├── messages.js
│   │   ├── downloadUtils.js
│   │   └── audioUtils.js
│   ├── background/
│   │   ├── background.js
│   │   ├── videoUrlStore.js
│   │   └── videoRequestMatcher.js
│   ├── offscreen/
│   │   └── offscreen.js
│   └── content/
│       ├── content.js
│       ├── instagramDetector.js
│       ├── tiktokDetector.js
│       ├── buttonInjector.js
│       └── panel.js
├── dist/                      (build output, gitignored)
└── tests/
    ├── videoUrlStore.test.js
    ├── videoRequestMatcher.test.js
    ├── downloadUtils.test.js
    ├── audioUtils.test.js
    ├── instagramDetector.test.js
    ├── tiktokDetector.test.js
    ├── buttonInjector.test.js
    └── panel.test.js
```

Icons are intentionally omitted from `manifest.json` for this plan — Chrome loads unpacked extensions fine without them. Add icon files later if publishing to the Web Store.

---

### Task 1: Project scaffolding and build pipeline

**Files:**
- Create: `package.json`
- Create: `esbuild.config.js`
- Create: `vitest.config.js`
- Create: `manifest.json`
- Create: `styles/content.css`
- Create: `src/background/background.js`
- Create: `src/content/content.js`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a buildable, loadable skeleton extension. `npm run build` produces `dist/background.js` and `dist/content.js`. Later tasks add source files that get bundled into these same two entry points, plus a third (`dist/offscreen.js`) starting at Task 6.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ig-tiktok-transcriber",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node esbuild.config.js",
    "test": "vitest run"
  },
  "devDependencies": {
    "esbuild": "^0.21.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Create `esbuild.config.js`**

```js
import { build } from 'esbuild';

const targets = [
  { name: 'background', entry: 'src/background/background.js', format: 'esm' },
  { name: 'content', entry: 'src/content/content.js', format: 'iife' },
];

for (const target of targets) {
  await build({
    entryPoints: [target.entry],
    bundle: true,
    outfile: `dist/${target.name}.js`,
    format: target.format,
    target: 'chrome110',
  });
}

console.log('Build complete.');
```

- [ ] **Step 5: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 6: Create the minimal background and content scripts**

`src/background/background.js`:
```js
console.log('[ITTX] background service worker cargado');
```

`src/content/content.js`:
```js
console.log('[ITTX] content script cargado en', window.location.hostname);
```

- [ ] **Step 7: Create `styles/content.css`**

```css
.ittx-button-row {
  display: inline-flex;
  gap: 8px;
  margin-left: 8px;
}

.ittx-icon-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
}
```

- [ ] **Step 8: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "IG/TikTok Transcriptor y Descargador",
  "version": "0.1.0",
  "description": "Transcribe y descarga videos de Instagram y TikTok directamente desde el feed.",
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.instagram.com/*", "*://*.tiktok.com/*"],
      "js": ["dist/content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 9: Build and verify output**

Run: `npm run build`
Expected: `Build complete.` printed, and `dist/background.js` + `dist/content.js` exist.

- [ ] **Step 10: Manual verification (hazlo vos en Chrome)**

1. Abrí `chrome://extensions`, activá "Modo de desarrollador".
2. Click "Cargar descomprimida" y seleccioná la carpeta `transcription app`.
3. Confirmá que la extensión carga sin errores.
4. Abrí `instagram.com`, abrí la consola (F12) y confirmá que aparece `[ITTX] content script cargado en www.instagram.com`.
5. Repetí en `tiktok.com`.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json esbuild.config.js vitest.config.js manifest.json styles/content.css src/background/background.js src/content/content.js .gitignore
git commit -m "chore: scaffold extension project with build pipeline"
```

---

### Task 2: Shared message types and video URL store

**Files:**
- Create: `src/shared/messages.js`
- Create: `src/background/videoUrlStore.js`
- Test: `tests/videoUrlStore.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `MessageType` and `MessageTarget` enums (used by every background/content/offscreen file from here on); `createVideoUrlStore()` returning `{ setVideoUrl(tabId, url), getVideoUrl(tabId, maxAgeMs = 30000), clearTab(tabId) }`, used by Task 3's `background.js`.

- [ ] **Step 1: Create `src/shared/messages.js`**

```js
export const MessageType = {
  GET_VIDEO_URL: 'GET_VIDEO_URL',
  DOWNLOAD_VIDEO: 'DOWNLOAD_VIDEO',
  TRANSCRIBE_AUDIO: 'TRANSCRIBE_AUDIO',
  TRANSCRIBE_PROGRESS: 'TRANSCRIBE_PROGRESS',
  TRANSCRIBE_RESULT: 'TRANSCRIBE_RESULT',
  TRANSCRIBE_ERROR: 'TRANSCRIBE_ERROR',
};

export const MessageTarget = {
  BACKGROUND: 'background',
  OFFSCREEN: 'offscreen',
};
```

- [ ] **Step 2: Write the failing test for the video URL store**

`tests/videoUrlStore.test.js`:
```js
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/videoUrlStore.test.js`
Expected: FAIL (cannot resolve `../src/background/videoUrlStore.js` — file doesn't exist yet).

- [ ] **Step 4: Implement `src/background/videoUrlStore.js`**

```js
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/videoUrlStore.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/shared/messages.js src/background/videoUrlStore.js tests/videoUrlStore.test.js
git commit -m "feat: add message types and per-tab video URL store"
```

---

### Task 3: Capture real video URLs via webRequest

**Files:**
- Create: `src/background/videoRequestMatcher.js`
- Test: `tests/videoRequestMatcher.test.js`
- Modify: `src/background/background.js`
- Modify: `manifest.json`

**Interfaces:**
- Consumes: `createVideoUrlStore` from Task 2 (`src/background/videoUrlStore.js`); `MessageType`, `MessageTarget` from Task 2 (`src/shared/messages.js`).
- Produces: `isVideoRequestUrl(url): boolean` (used only internally by `background.js` for now). The `GET_VIDEO_URL` runtime message contract: request `{ target: 'background', type: 'GET_VIDEO_URL' }` sent from a content script, response `{ url: string | null }` — this contract is relied on by Task 10's `content.js`.

- [ ] **Step 1: Write the failing test for the URL matcher**

`tests/videoRequestMatcher.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { isVideoRequestUrl } from '../src/background/videoRequestMatcher.js';

describe('isVideoRequestUrl', () => {
  it('matches an Instagram CDN mp4 URL', () => {
    expect(isVideoRequestUrl('https://scontent.cdninstagram.com/v/xyz.mp4?foo=bar')).toBe(true);
  });

  it('matches a TikTok CDN URL', () => {
    expect(isVideoRequestUrl('https://v16-webapp.tiktokcdn.com/abc123/')).toBe(true);
  });

  it('does not match an unrelated URL', () => {
    expect(isVideoRequestUrl('https://www.instagram.com/api/graphql')).toBe(false);
  });

  it('does not match an empty or missing URL', () => {
    expect(isVideoRequestUrl('')).toBe(false);
    expect(isVideoRequestUrl(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/videoRequestMatcher.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/background/videoRequestMatcher.js`**

```js
const VIDEO_URL_HINTS = ['.mp4', 'cdninstagram.com', 'fbcdn.net', 'tiktokcdn', 'tiktokv.com'];

export function isVideoRequestUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.toLowerCase();
  return VIDEO_URL_HINTS.some((hint) => lower.includes(hint));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/videoRequestMatcher.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire it into the background service worker**

Replace `src/background/background.js` entirely:
```js
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
```

- [ ] **Step 6: Update `manifest.json`** — add `webRequest` permission and CDN host permissions

```json
{
  "manifest_version": 3,
  "name": "IG/TikTok Transcriptor y Descargador",
  "version": "0.1.0",
  "description": "Transcribe y descarga videos de Instagram y TikTok directamente desde el feed.",
  "permissions": ["webRequest"],
  "host_permissions": [
    "*://*.instagram.com/*",
    "*://*.cdninstagram.com/*",
    "*://*.fbcdn.net/*",
    "*://*.tiktok.com/*",
    "*://*.tiktokcdn.com/*",
    "*://*.tiktokcdn-us.com/*",
    "*://*.tiktokv.com/*"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.instagram.com/*", "*://*.tiktok.com/*"],
      "js": ["dist/content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: `Build complete.`, no errors.

- [ ] **Step 8: Manual verification (hazlo vos en Chrome)**

1. Recargá la extensión en `chrome://extensions` (botón de recarga).
2. Click en "service worker" (link azul) para abrir su consola.
3. Abrí Instagram, reproducí un Reel.
4. Confirmá que aparece `[ITTX] video URL capturado ...` en la consola del service worker.

- [ ] **Step 9: Commit**

```bash
git add src/background/videoRequestMatcher.js src/background/background.js manifest.json tests/videoRequestMatcher.test.js
git commit -m "feat: capture real video CDN URLs via webRequest"
```

---

### Task 4: Download the captured video

**Files:**
- Create: `src/shared/downloadUtils.js`
- Test: `tests/downloadUtils.test.js`
- Modify: `src/background/background.js`
- Modify: `manifest.json`

**Interfaces:**
- Consumes: `videoUrlStore` instance and `MessageType`/`MessageTarget` from Task 2/3 (already in `background.js`).
- Produces: `buildDownloadFilename(prefix = 'ittx-video'): string`. The `DOWNLOAD_VIDEO` runtime message contract: request `{ target: 'background', type: 'DOWNLOAD_VIDEO' }`, response `{ success: boolean, error?: string }` — relied on by Task 10's `content.js`.

- [ ] **Step 1: Write the failing test for the filename builder**

`tests/downloadUtils.test.js`:
```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/downloadUtils.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/shared/downloadUtils.js`**

```js
export function buildDownloadFilename(prefix = 'ittx-video') {
  return `${prefix}-${Date.now()}.mp4`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/downloadUtils.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the download handler into `background.js`**

Replace `src/background/background.js` entirely:
```js
import { createVideoUrlStore } from './videoUrlStore.js';
import { isVideoRequestUrl } from './videoRequestMatcher.js';
import { buildDownloadFilename } from '../shared/downloadUtils.js';
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

  if (message.type === MessageType.DOWNLOAD_VIDEO) {
    const tabId = sender.tab?.id;
    const url = tabId != null ? videoUrlStore.getVideoUrl(tabId) : null;

    if (!url) {
      sendResponse({ success: false, error: 'NO_VIDEO_URL' });
      return false;
    }

    chrome.downloads.download({ url, filename: buildDownloadFilename() }, () => {
      sendResponse({ success: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message });
    });
    return true;
  }

  return false;
});
```

- [ ] **Step 6: Update `manifest.json`** — add `downloads` permission

Add `"downloads"` to the `permissions` array so it reads: `"permissions": ["webRequest", "downloads"],` — leave everything else in the file unchanged.

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: `Build complete.`, no errors.

- [ ] **Step 8: Manual verification (hazlo vos en Chrome)**

1. Recargá la extensión.
2. Abrí Instagram, reproducí un Reel.
3. Abrí la consola del service worker y ejecutá manualmente:
   ```js
   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
     chrome.tabs.sendMessage(tabs[0].id, {}); // solo para confirmar que el tab responde
   });
   ```
4. Desde la consola de la pestaña de Instagram (no la del service worker), ejecutá:
   ```js
   chrome.runtime.sendMessage({ target: 'background', type: 'DOWNLOAD_VIDEO' }, console.log);
   ```
5. Confirmá que el video se descarga y que la consola muestra `{ success: true }`.

- [ ] **Step 9: Commit**

```bash
git add src/shared/downloadUtils.js src/background/background.js manifest.json tests/downloadUtils.test.js
git commit -m "feat: download captured video via chrome.downloads"
```

---

### Task 5: Audio extraction utilities

**Files:**
- Create: `src/shared/audioUtils.js`
- Test: `tests/audioUtils.test.js`

**Interfaces:**
- Consumes: nothing (pure functions plus one browser-API function).
- Produces: `toMonoFloat32(channelData: Float32Array[]): Float32Array`, `resamplePCM(samples: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array`, and `decodeVideoToPCM16kMono(videoUrl: string): Promise<Float32Array>` — the last one is consumed by Task 10's `content.js` to produce the audio payload sent in the `TRANSCRIBE_AUDIO` message.

- [ ] **Step 1: Write the failing tests for the pure audio math**

`tests/audioUtils.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { toMonoFloat32, resamplePCM } from '../src/shared/audioUtils.js';

describe('toMonoFloat32', () => {
  it('returns the single channel unchanged when already mono', () => {
    const channel = new Float32Array([0.1, 0.2, 0.3]);
    expect(toMonoFloat32([channel])).toBe(channel);
  });

  it('averages two channels sample by sample', () => {
    const left = new Float32Array([1, 0, -1]);
    const right = new Float32Array([0, 0, 1]);
    const result = toMonoFloat32([left, right]);
    expect(Array.from(result)).toEqual([0.5, 0, 0]);
  });
});

describe('resamplePCM', () => {
  it('returns the same array when rates already match', () => {
    const samples = new Float32Array([1, 2, 3]);
    expect(resamplePCM(samples, 16000, 16000)).toBe(samples);
  });

  it('halves the length when downsampling by half', () => {
    const samples = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const result = resamplePCM(samples, 8000, 4000);
    expect(result.length).toBe(4);
  });

  it('keeps resampled values within the original value range', () => {
    const samples = new Float32Array([0, 10, 0, 10]);
    const result = resamplePCM(samples, 8000, 4000);
    for (const value of result) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(10);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/audioUtils.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/shared/audioUtils.js`**

```js
export function toMonoFloat32(channelData) {
  if (channelData.length === 1) return channelData[0];

  const length = channelData[0].length;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channelData.length; ch++) {
      sum += channelData[ch][i];
    }
    mono[i] = sum / channelData.length;
  }
  return mono;
}

export function resamplePCM(samples, fromSampleRate, toSampleRate) {
  if (fromSampleRate === toSampleRate) return samples;

  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const sourceIndex = i * ratio;
    const indexLow = Math.floor(sourceIndex);
    const indexHigh = Math.min(indexLow + 1, samples.length - 1);
    const weight = sourceIndex - indexLow;
    result[i] = samples[indexLow] * (1 - weight) + samples[indexHigh] * weight;
  }

  return result;
}

export async function decodeVideoToPCM16kMono(videoUrl) {
  const response = await fetch(videoUrl);
  const arrayBuffer = await response.arrayBuffer();

  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  const mono = toMonoFloat32(channelData);
  const resampled = resamplePCM(mono, audioBuffer.sampleRate, 16000);

  await audioContext.close();
  return resampled;
}
```

Note: `decodeVideoToPCM16kMono` uses browser-only APIs (`fetch`, `AudioContext`) unavailable in jsdom, so it is intentionally not unit tested here — it's covered by Task 10's manual end-to-end verification instead.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/audioUtils.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/audioUtils.js tests/audioUtils.test.js
git commit -m "feat: add audio downmix/resample utilities for Whisper input"
```

---

### Task 6: Offscreen document running Whisper

**Files:**
- Create: `offscreen.html`
- Create: `src/offscreen/offscreen.js`
- Modify: `src/background/background.js`
- Modify: `manifest.json`
- Modify: `esbuild.config.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `MessageType`, `MessageTarget` from Task 2.
- Produces: the `TRANSCRIBE_AUDIO` message contract, relied on by Task 10's `content.js`: request `{ target: 'background', type: 'TRANSCRIBE_AUDIO', audio: number[], requestId: string }` (a plain array of PCM samples, 16kHz mono, tagged with a caller-generated `requestId` so concurrent transcriptions in the same tab don't cross-talk). The background relays progress/result/error to the sending tab as `{ type: 'TRANSCRIBE_PROGRESS', requestId, progress: number }`, `{ type: 'TRANSCRIBE_RESULT', requestId, text: string }`, or `{ type: 'TRANSCRIBE_ERROR', requestId, message: string }`. The offscreen document processes one `TRANSCRIBE_AUDIO` request at a time, queuing any that arrive while one is in flight.

**Note on risk:** `@xenova/transformers` downloads model weights from Hugging Face and its ONNX WASM runtime from a CDN (jsDelivr) by default. If either load fails due to a CSP or CORS issue when running inside the offscreen document, the fix is to add the failing domain to `host_permissions` — check the offscreen document's DevTools console (inspect via `chrome://extensions` → "Inspect views: offscreen.html") for the exact blocked URL during manual verification.

- [ ] **Step 1: Add the `@xenova/transformers` dependency**

Modify `package.json` — add to `dependencies`:
```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.2"
  }
}
```

Run: `npm install`
Expected: installs without errors.

- [ ] **Step 2: Add the offscreen build target**

Replace `esbuild.config.js` entirely:
```js
import { build } from 'esbuild';

const targets = [
  { name: 'background', entry: 'src/background/background.js', format: 'esm' },
  { name: 'content', entry: 'src/content/content.js', format: 'iife' },
  { name: 'offscreen', entry: 'src/offscreen/offscreen.js', format: 'esm' },
];

for (const target of targets) {
  await build({
    entryPoints: [target.entry],
    bundle: true,
    outfile: `dist/${target.name}.js`,
    format: target.format,
    target: 'chrome110',
  });
}

console.log('Build complete.');
```

- [ ] **Step 3: Create `offscreen.html`**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ITTX Offscreen</title>
  </head>
  <body>
    <script type="module" src="dist/offscreen.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/offscreen/offscreen.js`**

```js
import { pipeline, env } from '@xenova/transformers';
import { MessageType, MessageTarget } from '../shared/messages.js';

env.allowLocalModels = false;

let transcriberPromise = null;
let queue = Promise.resolve();

function getTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
      progress_callback: onProgress,
    });
  }
  return transcriberPromise;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== MessageTarget.OFFSCREEN) return false;
  if (message.type !== MessageType.TRANSCRIBE_AUDIO) return false;

  // Chained onto `queue` so only one transcription runs at a time, even if
  // several TRANSCRIBE_AUDIO messages arrive close together.
  queue = queue.then(() => handleTranscribe(message));
  return false;
});

async function handleTranscribe({ audio, tabId, requestId }) {
  try {
    const transcriber = await getTranscriber((data) => {
      if (data.status === 'progress') {
        chrome.runtime.sendMessage({
          target: MessageTarget.BACKGROUND,
          type: MessageType.TRANSCRIBE_PROGRESS,
          tabId,
          requestId,
          progress: data.progress ?? 0,
        });
      }
    });

    const audioData = Float32Array.from(audio);
    const output = await transcriber(audioData, { language: 'spanish', task: 'transcribe' });

    chrome.runtime.sendMessage({
      target: MessageTarget.BACKGROUND,
      type: MessageType.TRANSCRIBE_RESULT,
      tabId,
      requestId,
      text: output.text.trim(),
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      target: MessageTarget.BACKGROUND,
      type: MessageType.TRANSCRIBE_ERROR,
      tabId,
      requestId,
      message: error.message,
    });
  }
}
```

- [ ] **Step 5: Wire offscreen creation and message relaying into `background.js`**

Replace `src/background/background.js` entirely:
```js
import { createVideoUrlStore } from './videoUrlStore.js';
import { isVideoRequestUrl } from './videoRequestMatcher.js';
import { buildDownloadFilename } from '../shared/downloadUtils.js';
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

async function ensureOffscreenDocument() {
  const hasDocument = await chrome.offscreen.hasDocument();
  if (hasDocument) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Ejecutar el modelo de transcripción Whisper vía WebAssembly.',
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== MessageTarget.BACKGROUND) return false;

  if (message.type === MessageType.GET_VIDEO_URL) {
    const tabId = sender.tab?.id;
    sendResponse({ url: tabId != null ? videoUrlStore.getVideoUrl(tabId) : null });
    return false;
  }

  if (message.type === MessageType.DOWNLOAD_VIDEO) {
    const tabId = sender.tab?.id;
    const url = tabId != null ? videoUrlStore.getVideoUrl(tabId) : null;

    if (!url) {
      sendResponse({ success: false, error: 'NO_VIDEO_URL' });
      return false;
    }

    chrome.downloads.download({ url, filename: buildDownloadFilename() }, () => {
      sendResponse({ success: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message });
    });
    return true;
  }

  if (message.type === MessageType.TRANSCRIBE_AUDIO) {
    const tabId = sender.tab?.id;
    ensureOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({
        target: MessageTarget.OFFSCREEN,
        type: MessageType.TRANSCRIBE_AUDIO,
        audio: message.audio,
        requestId: message.requestId,
        tabId,
      });
    });
    return false;
  }

  const isOffscreenRelay =
    !sender.tab &&
    [MessageType.TRANSCRIBE_PROGRESS, MessageType.TRANSCRIBE_RESULT, MessageType.TRANSCRIBE_ERROR].includes(
      message.type,
    );

  if (isOffscreenRelay) {
    chrome.tabs.sendMessage(message.tabId, message);
    return false;
  }

  return false;
});
```

- [ ] **Step 6: Update `manifest.json`** — add `offscreen` permission and model/runtime host permissions

```json
{
  "manifest_version": 3,
  "name": "IG/TikTok Transcriptor y Descargador",
  "version": "0.1.0",
  "description": "Transcribe y descarga videos de Instagram y TikTok directamente desde el feed.",
  "permissions": ["webRequest", "downloads", "offscreen"],
  "host_permissions": [
    "*://*.instagram.com/*",
    "*://*.cdninstagram.com/*",
    "*://*.fbcdn.net/*",
    "*://*.tiktok.com/*",
    "*://*.tiktokcdn.com/*",
    "*://*.tiktokcdn-us.com/*",
    "*://*.tiktokv.com/*",
    "https://*.huggingface.co/*",
    "https://*.hf.co/*",
    "https://cdn.jsdelivr.net/*"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.instagram.com/*", "*://*.tiktok.com/*"],
      "js": ["dist/content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: `Build complete.`, `dist/offscreen.js` now exists (this file will be large, ~1-2MB, since it bundles the transformers.js library — that's expected).

- [ ] **Step 8: Manual verification (hazlo vos en Chrome)**

1. Recargá la extensión.
2. Abrí Instagram, reproducí un Reel para que se capture su URL (paso del Task 3).
3. Desde la consola de la pestaña de Instagram, tomá el audio de prueba y disparalo manualmente:
   ```js
   chrome.runtime.sendMessage({ target: 'background', type: 'TRANSCRIBE_AUDIO', audio: new Array(16000).fill(0) }, console.log);
   ```
4. En `chrome://extensions`, click "Inspeccionar vistas: offscreen.html" para ver su consola.
5. Confirmá que no hay errores de CORS/CSP al descargar el modelo (primera vez puede tardar 30-60s por los ~150MB). Si ves un error de red bloqueada, anotá el dominio exacto y agregalo a `host_permissions`.
6. En la pestaña de Instagram deberías recibir, vía `chrome.runtime.onMessage`, un mensaje `TRANSCRIBE_RESULT` (con audio en silencio, `text` puede venir vacío — lo importante es que el pipeline corre sin errores).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json esbuild.config.js offscreen.html src/offscreen/offscreen.js src/background/background.js manifest.json
git commit -m "feat: run local Whisper transcription in an offscreen document"
```

---

### Task 7: Instagram post detector

**Files:**
- Create: `src/content/instagramDetector.js`
- Test: `tests/instagramDetector.test.js`

**Interfaces:**
- Consumes: nothing (pure DOM functions).
- Produces: `findUnprocessedVideoPosts(root = document): HTMLVideoElement[]`, `markAsProcessed(video: HTMLVideoElement): void`, `findActionBar(video: HTMLVideoElement): HTMLElement | null` — all consumed by Task 10's `content.js`.

- [ ] **Step 1: Write the failing tests**

`tests/instagramDetector.test.js`:
```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/instagramDetector.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/content/instagramDetector.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/instagramDetector.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/instagramDetector.js tests/instagramDetector.test.js
git commit -m "feat: detect unprocessed Instagram video posts and their action bar"
```

---

### Task 8: TikTok post detector

**Files:**
- Create: `src/content/tiktokDetector.js`
- Test: `tests/tiktokDetector.test.js`

**Interfaces:**
- Consumes: nothing (pure DOM functions).
- Produces: `findUnprocessedVideoPosts(root = document): HTMLVideoElement[]`, `markAsProcessed(video: HTMLVideoElement): void`, `findActionBar(video: HTMLVideoElement): HTMLElement | null` — same shape as Task 7's Instagram detector, both consumed by Task 10's `content.js`.

- [ ] **Step 1: Write the failing tests**

`tests/tiktokDetector.test.js`:
```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/tiktokDetector.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/content/tiktokDetector.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/tiktokDetector.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/tiktokDetector.js tests/tiktokDetector.test.js
git commit -m "feat: detect unprocessed TikTok video posts and their action bar"
```

---

### Task 9: Button injector and transcript panel UI

**Files:**
- Create: `src/content/buttonInjector.js`
- Create: `src/content/panel.js`
- Test: `tests/buttonInjector.test.js`
- Test: `tests/panel.test.js`

**Interfaces:**
- Consumes: nothing (pure DOM functions).
- Produces: `injectButtons(actionBarEl, { onTranscribe, onDownload }): { container, transcribeBtn, downloadBtn }`; `createPanel(): HTMLElement`, `showLoading(panel, message)`, `showProgress(panel, message, percent)`, `showTranscript(panel, text)`, `showError(panel, message)` — all consumed by Task 10's `content.js`.

- [ ] **Step 1: Write the failing test for the button injector**

`tests/buttonInjector.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { injectButtons } from '../src/content/buttonInjector.js';

describe('injectButtons', () => {
  let actionBar;

  beforeEach(() => {
    document.body.innerHTML = '<div id="action-bar"></div>';
    actionBar = document.getElementById('action-bar');
  });

  it('appends a button row with a transcribe and a download button', () => {
    injectButtons(actionBar, { onTranscribe: () => {}, onDownload: () => {} });
    expect(actionBar.querySelectorAll('.ittx-icon-button').length).toBe(2);
  });

  it('calls onTranscribe when the transcribe button is clicked', () => {
    const onTranscribe = vi.fn();
    const { transcribeBtn } = injectButtons(actionBar, { onTranscribe, onDownload: () => {} });
    transcribeBtn.click();
    expect(onTranscribe).toHaveBeenCalledTimes(1);
  });

  it('calls onDownload when the download button is clicked', () => {
    const onDownload = vi.fn();
    const { downloadBtn } = injectButtons(actionBar, { onTranscribe: () => {}, onDownload });
    downloadBtn.click();
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/buttonInjector.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/content/buttonInjector.js`**

```js
export function injectButtons(actionBarEl, { onTranscribe, onDownload }) {
  const container = document.createElement('div');
  container.className = 'ittx-button-row';

  const transcribeBtn = document.createElement('button');
  transcribeBtn.className = 'ittx-icon-button';
  transcribeBtn.setAttribute('aria-label', 'Transcribir video');
  transcribeBtn.textContent = '🎙️';
  transcribeBtn.addEventListener('click', onTranscribe);

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'ittx-icon-button';
  downloadBtn.setAttribute('aria-label', 'Descargar video');
  downloadBtn.textContent = '⬇️';
  downloadBtn.addEventListener('click', onDownload);

  container.appendChild(transcribeBtn);
  container.appendChild(downloadBtn);
  actionBarEl.appendChild(container);

  return { container, transcribeBtn, downloadBtn };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/buttonInjector.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for the panel**

`tests/panel.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createPanel, showLoading, showProgress, showTranscript, showError } from '../src/content/panel.js';

describe('panel', () => {
  let panel;

  beforeEach(() => {
    panel = createPanel();
  });

  it('is hidden by default', () => {
    expect(panel.hidden).toBe(true);
  });

  it('shows a loading message', () => {
    showLoading(panel, 'Transcribiendo...');
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Transcribiendo...');
  });

  it('shows progress as a percentage', () => {
    showProgress(panel, 'Descargando modelo', 45.6);
    expect(panel.textContent).toContain('Descargando modelo (46%)');
  });

  it('shows the transcript text with a copy and close button', () => {
    showTranscript(panel, 'Hola mundo');
    expect(panel.textContent).toContain('Hola mundo');
    expect(panel.querySelector('.ittx-panel-copy')).not.toBeNull();
    expect(panel.querySelector('.ittx-panel-close')).not.toBeNull();
  });

  it('shows a fallback message when the transcript is empty', () => {
    showTranscript(panel, '');
    expect(panel.textContent).toContain('No se detectó habla en este video.');
  });

  it('shows an error message', () => {
    showError(panel, 'Algo salió mal');
    expect(panel.querySelector('.ittx-panel-error').textContent).toBe('Algo salió mal');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run tests/panel.test.js`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `src/content/panel.js`**

```js
export function createPanel() {
  const panel = document.createElement('div');
  panel.className = 'ittx-panel';
  panel.hidden = true;
  return panel;
}

export function showLoading(panel, message) {
  panel.hidden = false;
  panel.innerHTML = '';
  const text = document.createElement('p');
  text.className = 'ittx-panel-status';
  text.textContent = message;
  panel.appendChild(text);
}

export function showProgress(panel, message, percent) {
  showLoading(panel, `${message} (${Math.round(percent)}%)`);
}

export function showTranscript(panel, text) {
  panel.hidden = false;
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'ittx-panel-header';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'ittx-panel-copy';
  copyBtn.textContent = 'Copiar';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ittx-panel-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    panel.hidden = true;
  });

  header.appendChild(copyBtn);
  header.appendChild(closeBtn);

  const body = document.createElement('p');
  body.className = 'ittx-panel-text';
  body.textContent = text || 'No se detectó habla en este video.';

  panel.appendChild(header);
  panel.appendChild(body);
}

export function showError(panel, message) {
  panel.hidden = false;
  panel.innerHTML = '';
  const text = document.createElement('p');
  text.className = 'ittx-panel-error';
  text.textContent = message;
  panel.appendChild(text);
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run tests/panel.test.js`
Expected: PASS (6 tests).

- [ ] **Step 9: Add panel styles**

Append to `styles/content.css`:
```css
.ittx-panel {
  margin: 8px 0;
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 14px;
}

.ittx-panel-header {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 4px;
}

.ittx-panel-error {
  color: #c00;
}
```

- [ ] **Step 10: Commit**

```bash
git add src/content/buttonInjector.js src/content/panel.js styles/content.css tests/buttonInjector.test.js tests/panel.test.js
git commit -m "feat: add button injector and transcript panel UI components"
```

---

### Task 10: Wire it all together in the content script

**Files:**
- Modify: `src/content/content.js`

**Interfaces:**
- Consumes: everything produced by Tasks 2-9 — `MessageType`/`MessageTarget` (Task 2), the `GET_VIDEO_URL`/`DOWNLOAD_VIDEO`/`TRANSCRIBE_AUDIO` message contracts (Tasks 3, 4, 6), `decodeVideoToPCM16kMono` (Task 5), `instagramDetector`/`tiktokDetector` (Tasks 7, 8), `injectButtons`/panel functions (Task 9).
- Produces: the finished user-facing feature. No further tasks depend on this file.

- [ ] **Step 1: Replace `src/content/content.js` entirely**

```js
import * as instagramDetector from './instagramDetector.js';
import * as tiktokDetector from './tiktokDetector.js';
import { injectButtons } from './buttonInjector.js';
import { createPanel, showLoading, showProgress, showTranscript, showError } from './panel.js';
import { decodeVideoToPCM16kMono } from '../shared/audioUtils.js';
import { MessageType, MessageTarget } from '../shared/messages.js';

const detector = window.location.hostname.includes('tiktok.com') ? tiktokDetector : instagramDetector;

function sendToBackground(message) {
  return chrome.runtime.sendMessage({ target: MessageTarget.BACKGROUND, ...message });
}

async function handleDownloadClick(panel) {
  const response = await sendToBackground({ type: MessageType.DOWNLOAD_VIDEO });
  if (!response.success) {
    const message =
      response.error === 'NO_VIDEO_URL'
        ? 'Reproducí el video primero.'
        : 'No se pudo descargar el video, probá recargando la página.';
    showError(panel, message);
  }
}

async function handleTranscribeClick(panel) {
  showLoading(panel, 'Buscando el video...');

  const { url } = await sendToBackground({ type: MessageType.GET_VIDEO_URL });
  if (!url) {
    showError(panel, 'Reproducí el video primero.');
    return;
  }

  let pcm;
  try {
    showLoading(panel, 'Procesando audio...');
    pcm = await decodeVideoToPCM16kMono(url);
  } catch {
    showError(panel, 'No se pudo procesar este video, probá recargando la página.');
    return;
  }

  // Tagged with a unique requestId so that transcribing two different posts
  // close together doesn't cross-wire their results: this content script
  // receives every TRANSCRIBE_* message sent to the tab, not just the ones
  // meant for this particular panel.
  const requestId = crypto.randomUUID();

  const messageListener = (message) => {
    if (message.requestId !== requestId) return;

    if (message.type === MessageType.TRANSCRIBE_PROGRESS) {
      showProgress(panel, 'Descargando modelo de IA', message.progress);
    } else if (message.type === MessageType.TRANSCRIBE_RESULT) {
      showTranscript(panel, message.text);
      chrome.runtime.onMessage.removeListener(messageListener);
    } else if (message.type === MessageType.TRANSCRIBE_ERROR) {
      showError(panel, 'Ocurrió un error al transcribir. Probá de nuevo.');
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);

  showLoading(panel, 'Transcribiendo...');
  sendToBackground({ type: MessageType.TRANSCRIBE_AUDIO, audio: Array.from(pcm), requestId });
}

function processNewPosts() {
  const videos = detector.findUnprocessedVideoPosts();

  for (const video of videos) {
    detector.markAsProcessed(video);

    const actionBar = detector.findActionBar(video);
    if (!actionBar) continue;

    const panel = createPanel();
    const { container } = injectButtons(actionBar, {
      onTranscribe: () => handleTranscribeClick(panel),
      onDownload: () => handleDownloadClick(panel),
    });

    container.after(panel);
  }
}

const observer = new MutationObserver(() => processNewPosts());
observer.observe(document.body, { childList: true, subtree: true });
processNewPosts();
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `Build complete.`, no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests across every file still PASS.

- [ ] **Step 4: Manual verification (hazlo vos en Chrome)**

1. Recargá la extensión.
2. Abrí Instagram, hacé scroll por el feed. Confirmá que los 2 íconos aparecen junto al botón de "Me gusta" en los posts con video, y que no aparecen en posts de solo fotos.
3. Reproducí un Reel, click en "Descargar" → confirmá que el .mp4 se descarga.
4. Click en "Transcribir" → confirmá que aparece "Procesando audio...", luego el progreso de descarga del modelo (primera vez) o "Transcribiendo..." directamente (siguientes veces), y finalmente el texto transcripto en español.
5. Click en "Copiar" → pegá en cualquier lado y confirmá que el texto coincide.
6. Repetí los pasos 2-5 en TikTok.

- [ ] **Step 5: Commit**

```bash
git add src/content/content.js
git commit -m "feat: wire detectors, buttons, panel and messaging into content script"
```

---

### Task 11: End-to-end verification and permission audit

**Files:** none (verification only).

**Interfaces:** none — this task validates the finished feature against the design spec.

- [ ] **Step 1: Fresh install test**

Remove the extension from `chrome://extensions` and load it unpacked again from scratch, to rule out any stale state from development. Confirm it loads with no errors.

- [ ] **Step 2: Instagram golden path**

Scroll the feed, play a Reel, transcribe it, download it. Confirm the transcript is in Spanish and roughly matches what's said in the video.

- [ ] **Step 3: TikTok golden path**

Repeat Step 2 on TikTok.

- [ ] **Step 4: Edge cases**

- Click "Transcribir"/"Descargar" on a video that hasn't been played yet → confirm the "Reproducí el video primero" message appears instead of a crash.
- Turn off Wi-Fi/network and click "Transcribir" on an already-captured video → confirm a clear error message appears (not a silent failure).
- Trigger two transcriptions back-to-back on two different posts → confirm both complete (the second may wait for the first, given the shared offscreen document processes one at a time by construction of the single `transcriberPromise`).
- Scroll past a photo-only post (no video) → confirm no buttons are injected on it.

- [ ] **Step 5: Permission audit**

Open `manifest.json` and confirm:
- No `<all_urls>` permission is present.
- Every entry in `host_permissions` is a domain the extension actually needs (Instagram, TikTok, their CDNs, Hugging Face, jsDelivr).
- `permissions` contains only `webRequest`, `downloads`, `offscreen` — nothing else.

- [ ] **Step 6: Final commit (if any fixes were made during verification)**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end verification"
```

If no issues were found, skip this step — there is nothing to commit.
