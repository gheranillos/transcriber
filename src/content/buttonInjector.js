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
