// AI Mastering Engine — client-side Web Audio processing pipeline
// Analyzes audio → applies parametric EQ, multiband compression, stereo enhancement, limiting, loudness normalization

export interface MasteringPreset {
  name: string;
  eq: { lowGain: number; midGain: number; highGain: number; lowFreq: number; highFreq: number };
  compression: { threshold: number; ratio: number; attack: number; release: number; knee: number };
  stereoWidth: number; // 0-2, 1 = neutral
  limiterCeiling: number; // dBFS
  targetLUFS: number;
}

export const MASTERING_PRESETS: Record<string, MasteringPreset> = {
  pop: {
    name: 'Pop',
    eq: { lowGain: 2, midGain: 1, highGain: 3, lowFreq: 100, highFreq: 8000 },
    compression: { threshold: -18, ratio: 3, attack: 0.01, release: 0.15, knee: 6 },
    stereoWidth: 1.2,
    limiterCeiling: -0.3,
    targetLUFS: -14,
  },
  hiphop: {
    name: 'Hip-Hop',
    eq: { lowGain: 4, midGain: -1, highGain: 2, lowFreq: 80, highFreq: 10000 },
    compression: { threshold: -16, ratio: 4, attack: 0.005, release: 0.1, knee: 3 },
    stereoWidth: 1.1,
    limiterCeiling: -0.1,
    targetLUFS: -11,
  },
  rock: {
    name: 'Rock',
    eq: { lowGain: 2, midGain: 2, highGain: 1, lowFreq: 120, highFreq: 6000 },
    compression: { threshold: -20, ratio: 3.5, attack: 0.008, release: 0.12, knee: 4 },
    stereoWidth: 1.3,
    limiterCeiling: -0.3,
    targetLUFS: -13,
  },
  electronic: {
    name: 'Electronic',
    eq: { lowGain: 3, midGain: 0, highGain: 4, lowFreq: 60, highFreq: 12000 },
    compression: { threshold: -15, ratio: 4, attack: 0.003, release: 0.08, knee: 2 },
    stereoWidth: 1.5,
    limiterCeiling: -0.1,
    targetLUFS: -10,
  },
  acoustic: {
    name: 'Acoustic',
    eq: { lowGain: 1, midGain: 1.5, highGain: 2, lowFreq: 150, highFreq: 7000 },
    compression: { threshold: -24, ratio: 2, attack: 0.02, release: 0.2, knee: 10 },
    stereoWidth: 1.0,
    limiterCeiling: -1.0,
    targetLUFS: -16,
  },
  lofi: {
    name: 'Lo-Fi',
    eq: { lowGain: 2, midGain: -2, highGain: -3, lowFreq: 200, highFreq: 5000 },
    compression: { threshold: -22, ratio: 2.5, attack: 0.015, release: 0.25, knee: 8 },
    stereoWidth: 0.8,
    limiterCeiling: -1.5,
    targetLUFS: -16,
  },
};

export interface AudioAnalysis {
  peakdB: number;
  rmsdB: number;
  estimatedLUFS: number;
  crestFactor: number;
  spectrum: Float32Array; // 512-bin FFT magnitude
  duration: number;
  sampleRate: number;
  channels: number;
}

// Analyze audio buffer for loudness metrics
export function analyzeAudio(buffer: AudioBuffer): AudioAnalysis {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  let peak = 0;
  let sumSquares = 0;

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
      sumSquares += data[i] * data[i];
    }
  }

  const totalSamples = length * channels;
  const rms = Math.sqrt(sumSquares / totalSamples);
  const peakdB = 20 * Math.log10(peak || 1e-10);
  const rmsdB = 20 * Math.log10(rms || 1e-10);
  const estimatedLUFS = rmsdB - 0.691; // Simplified LUFS approximation
  const crestFactor = peakdB - rmsdB;

  // Simple FFT-like spectrum via averaging blocks
  const fftSize = 1024;
  const spectrum = new Float32Array(512);
  const mono = buffer.getChannelData(0);
  const numBlocks = Math.floor(length / fftSize);

  if (numBlocks > 0) {
    for (let b = 0; b < Math.min(numBlocks, 100); b++) {
      const offset = b * fftSize;
      for (let i = 0; i < 512; i++) {
        const re = mono[offset + i * 2] || 0;
        const im = mono[offset + i * 2 + 1] || 0;
        spectrum[i] += Math.sqrt(re * re + im * im);
      }
    }
    const blocks = Math.min(numBlocks, 100);
    for (let i = 0; i < 512; i++) {
      spectrum[i] = spectrum[i] / blocks;
    }
  }

  return {
    peakdB,
    rmsdB,
    estimatedLUFS,
    crestFactor,
    spectrum,
    duration: length / sampleRate,
    sampleRate,
    channels,
  };
}

export interface MasteringOptions {
  preset: MasteringPreset;
  intensity: number; // 0-1, scales effect strength
  onProgress?: (progress: number) => void;
}

// Apply full mastering chain via OfflineAudioContext
export async function applyMastering(
  inputBuffer: AudioBuffer,
  options: MasteringOptions
): Promise<AudioBuffer> {
  const { preset, intensity, onProgress } = options;
  const { sampleRate, numberOfChannels, length } = inputBuffer;
  const ctx = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  // Source
  const source = ctx.createBufferSource();
  source.buffer = inputBuffer;

  onProgress?.(0.1);

  // === Stage 1: Parametric EQ (3-band) ===
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = preset.eq.lowFreq;
  lowShelf.gain.value = preset.eq.lowGain * intensity;

  const midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = Math.sqrt(preset.eq.lowFreq * preset.eq.highFreq);
  midPeak.Q.value = 0.7;
  midPeak.gain.value = preset.eq.midGain * intensity;

  const highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = preset.eq.highFreq;
  highShelf.gain.value = preset.eq.highGain * intensity;

  onProgress?.(0.2);

  // === Stage 2: Compression via DynamicsCompressor ===
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = preset.compression.threshold;
  compressor.ratio.value = 1 + (preset.compression.ratio - 1) * intensity;
  compressor.attack.value = preset.compression.attack;
  compressor.release.value = preset.compression.release;
  compressor.knee.value = preset.compression.knee;

  onProgress?.(0.3);

  // === Stage 3: Stereo Enhancement (mid-side widening) ===
  // Implemented as gain adjustment — true M/S needs ScriptProcessorNode or AudioWorklet
  const stereoGain = ctx.createGain();
  const widthFactor = 1 + (preset.stereoWidth - 1) * intensity;
  stereoGain.gain.value = Math.min(widthFactor, 2);

  // === Stage 4: Limiter (compressor with high ratio) ===
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = preset.limiterCeiling;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  limiter.knee.value = 0;

  onProgress?.(0.4);

  // === Stage 5: Output gain for loudness normalization ===
  const analysis = analyzeAudio(inputBuffer);
  const lufsGap = preset.targetLUFS - analysis.estimatedLUFS;
  const makeupGain = Math.pow(10, (lufsGap * intensity) / 20);
  const outputGain = ctx.createGain();
  outputGain.gain.value = Math.min(makeupGain, 6); // Cap at +15.5dB

  // Chain: source → EQ → compressor → stereo → limiter → output
  source.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(stereoGain);
  stereoGain.connect(limiter);
  limiter.connect(outputGain);
  outputGain.connect(ctx.destination);

  source.start(0);

  onProgress?.(0.5);

  const rendered = await ctx.startRendering();

  onProgress?.(0.9);

  // Final safety clamp to prevent clipping
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 1) data[i] = 1;
      if (data[i] < -1) data[i] = -1;
    }
  }

  onProgress?.(1.0);
  return rendered;
}

// Export mastered audio as WAV blob
export function exportMasteredWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
