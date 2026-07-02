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
