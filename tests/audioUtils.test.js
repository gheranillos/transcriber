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
