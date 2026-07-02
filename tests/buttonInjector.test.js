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
