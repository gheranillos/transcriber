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
  let resampled;
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = [];
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      channelData.push(audioBuffer.getChannelData(ch));
    }

    const mono = toMonoFloat32(channelData);
    resampled = resamplePCM(mono, audioBuffer.sampleRate, 16000);
  } finally {
    await audioContext.close();
  }
  return resampled;
}
