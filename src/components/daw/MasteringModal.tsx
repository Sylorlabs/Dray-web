'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  MASTERING_PRESETS,
  analyzeAudio,
  applyMastering,
  exportMasteredWav,
  type AudioAnalysis,
  type MasteringPreset,
} from '@/lib/masteringEngine';
import { logger } from '@/lib/logger';

interface MasteringModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBuffer: AudioBuffer | null;
}

export default function MasteringModal({ isOpen, onClose, audioBuffer }: MasteringModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('pop');
  const [intensity, setIntensity] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [masteredAnalysis, setMasteredAnalysis] = useState<AudioAnalysis | null>(null);
  const [masteredBuffer, setMasteredBuffer] = useState<AudioBuffer | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Analyze input on open
  useEffect(() => {
    if (isOpen && audioBuffer) {
      setAnalysis(analyzeAudio(audioBuffer));
      setMasteredBuffer(null);
      setMasteredAnalysis(null);
    }
  }, [isOpen, audioBuffer]);

  const handleMaster = useCallback(async () => {
    if (!audioBuffer) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const preset = MASTERING_PRESETS[selectedPreset];
      const result = await applyMastering(audioBuffer, {
        preset,
        intensity,
        onProgress: setProgress,
      });
      setMasteredBuffer(result);
      setMasteredAnalysis(analyzeAudio(result));
    } catch (err) {
      logger.error('Mastering failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [audioBuffer, selectedPreset, intensity]);

  const handlePreview = useCallback(() => {
    const buffer = masteredBuffer || audioBuffer;
    if (!buffer) return;

    if (isPreviewing) {
      previewSourceRef.current?.stop();
      previewCtxRef.current?.close();
      setIsPreviewing(false);
      return;
    }

    const ctx = new AudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPreviewing(false);
    source.start(0);

    previewCtxRef.current = ctx;
    previewSourceRef.current = source;
    setIsPreviewing(true);
  }, [audioBuffer, masteredBuffer, isPreviewing]);

  const handleExport = useCallback(() => {
    if (!masteredBuffer) return;
    const blob = exportMasteredWav(masteredBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mastered-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [masteredBuffer]);

  if (!isOpen) return null;

  const preset = MASTERING_PRESETS[selectedPreset];

  const formatDb = (db: number) => `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
  const formatLUFS = (lufs: number) => `${lufs.toFixed(1)} LUFS`;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🎛️ AI Mastering</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Genre Preset Selector */}
          <div style={styles.section}>
            <label style={styles.label}>Genre Preset</label>
            <div style={styles.presetGrid}>
              {Object.entries(MASTERING_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPreset(key)}
                  style={{
                    ...styles.presetBtn,
                    ...(selectedPreset === key ? styles.presetBtnActive : {}),
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Slider */}
          <div style={styles.section}>
            <label style={styles.label}>
              Intensity: {Math.round(intensity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              style={styles.slider}
            />
          </div>

          {/* Preset Details */}
          <div style={styles.section}>
            <div style={styles.detailGrid}>
              <span>EQ: Low {preset.eq.lowGain > 0 ? '+' : ''}{preset.eq.lowGain}dB</span>
              <span>Mid {preset.eq.midGain > 0 ? '+' : ''}{preset.eq.midGain}dB</span>
              <span>High {preset.eq.highGain > 0 ? '+' : ''}{preset.eq.highGain}dB</span>
              <span>Comp: {preset.compression.ratio}:1 @ {preset.compression.threshold}dB</span>
              <span>Width: {preset.stereoWidth}x</span>
              <span>Target: {preset.targetLUFS} LUFS</span>
            </div>
          </div>

          {/* Meters */}
          {analysis && (
            <div style={styles.section}>
              <label style={styles.label}>Analysis</label>
              <div style={styles.meterRow}>
                <div style={styles.meterBlock}>
                  <div style={styles.meterLabel}>Before</div>
                  <div style={styles.meterValue}>{formatDb(analysis.peakdB)} peak</div>
                  <div style={styles.meterValue}>{formatLUFS(analysis.estimatedLUFS)}</div>
                  <div style={styles.meterValue}>Crest: {analysis.crestFactor.toFixed(1)}dB</div>
                </div>
                {masteredAnalysis && (
                  <>
                    <div style={styles.arrow}>→</div>
                    <div style={styles.meterBlock}>
                      <div style={styles.meterLabel}>After</div>
                      <div style={styles.meterValue}>{formatDb(masteredAnalysis.peakdB)} peak</div>
                      <div style={styles.meterValue}>{formatLUFS(masteredAnalysis.estimatedLUFS)}</div>
                      <div style={styles.meterValue}>Crest: {masteredAnalysis.crestFactor.toFixed(1)}dB</div>
                    </div>
                  </>
                )}
              </div>

              {/* Simple Spectrum Bar */}
              <div style={styles.spectrumContainer}>
                <canvas
                  ref={(canvas) => {
                    if (!canvas || !analysis) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    const w = canvas.width;
                    const h = canvas.height;
                    ctx.clearRect(0, 0, w, h);
                    const data = masteredAnalysis?.spectrum || analysis.spectrum;
                    const barCount = 64;
                    const step = Math.floor(data.length / barCount);
                    const barW = w / barCount;
                    let max = 0;
                    for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i];
                    if (max === 0) max = 1;
                    for (let i = 0; i < barCount; i++) {
                      const val = data[i * step] / max;
                      const barH = val * h * 0.9;
                      const hue = 200 + val * 120;
                      ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
                      ctx.fillRect(i * barW + 1, h - barH, barW - 2, barH);
                    }
                  }}
                  width={384}
                  height={80}
                  style={styles.spectrumCanvas}
                />
              </div>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div style={styles.progressContainer}>
              <div style={{ ...styles.progressBar, width: `${progress * 100}%` }} />
              <span style={styles.progressText}>{Math.round(progress * 100)}%</span>
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              onClick={handlePreview}
              style={styles.actionBtn}
              disabled={!audioBuffer}
            >
              {isPreviewing ? '⏹ Stop' : '▶ Preview'}
            </button>
            <button
              onClick={handleMaster}
              style={{ ...styles.actionBtn, ...styles.masterBtn }}
              disabled={isProcessing || !audioBuffer}
            >
              {isProcessing ? 'Processing...' : '🤖 Master'}
            </button>
            <button
              onClick={handleExport}
              style={styles.actionBtn}
              disabled={!masteredBuffer}
            >
              💾 Export WAV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: '#1a1a2e', borderRadius: 12, width: 480, maxHeight: '90vh',
    overflow: 'auto', border: '1px solid #333',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #333',
  },
  title: { margin: 0, fontSize: 18, color: '#fff' },
  closeBtn: {
    background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer',
  },
  body: { padding: 20 },
  section: { marginBottom: 20 },
  label: { display: 'block', color: '#aaa', fontSize: 13, marginBottom: 8 },
  presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  presetBtn: {
    padding: '8px 12px', background: '#252540', border: '1px solid #444',
    borderRadius: 6, color: '#ccc', cursor: 'pointer', fontSize: 13,
  },
  presetBtnActive: {
    background: '#4a3f8a', borderColor: '#7c6ff0', color: '#fff',
  },
  slider: { width: '100%', accentColor: '#7c6ff0' },
  detailGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
    fontSize: 11, color: '#888',
  },
  meterRow: { display: 'flex', gap: 16, alignItems: 'center' },
  meterBlock: {
    flex: 1, background: '#0d0d1a', borderRadius: 8, padding: 12,
  },
  meterLabel: { color: '#7c6ff0', fontSize: 12, marginBottom: 4 },
  meterValue: { color: '#ddd', fontSize: 13 },
  arrow: { color: '#7c6ff0', fontSize: 24 },
  spectrumContainer: { marginTop: 12 },
  spectrumCanvas: {
    width: '100%', height: 80, background: '#0d0d1a', borderRadius: 6,
  },
  progressContainer: {
    position: 'relative' as const, height: 24, background: '#252540',
    borderRadius: 12, marginBottom: 16, overflow: 'hidden',
  },
  progressBar: {
    height: '100%', background: 'linear-gradient(90deg, #7c6ff0, #4ecdc4)',
    borderRadius: 12, transition: 'width 0.3s',
  },
  progressText: {
    position: 'absolute' as const, inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 12, fontWeight: 600,
  },
  actions: { display: 'flex', gap: 12 },
  actionBtn: {
    flex: 1, padding: '10px 16px', background: '#252540', border: '1px solid #444',
    borderRadius: 8, color: '#ccc', cursor: 'pointer', fontSize: 14,
  },
  masterBtn: {
    background: '#4a3f8a', borderColor: '#7c6ff0', color: '#fff', fontWeight: 600,
  },
};
