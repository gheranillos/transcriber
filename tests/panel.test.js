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
