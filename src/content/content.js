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
