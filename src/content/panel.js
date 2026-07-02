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
