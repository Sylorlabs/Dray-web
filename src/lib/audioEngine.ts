import { logger } from './logger';
import type { ToneLibType } from './toneWrapper';

class AudioEngine {
  private static instance: AudioEngine;
  private context: AudioContext | null = null;
  private masterGain: InstanceType<ToneLibType['Gain']> | null = null;
  private _isInitialized = false;
  private Tone: ToneLibType | null = null;
  private initializationPromise: Promise<void> | null = null;
  private currentLatencyHint: 'interactive' | 'balanced' | 'playback' = 'playback';
  private currentLookAhead = 0.1;
  private static contextCreationCount = 0;
  private static hasWarnedMultipleContexts = false;

  // Track channels for mixing
  private trackChannels = new Map<number, { input: InstanceType<ToneLibType['Gain']>; volume: InstanceType<ToneLibType['Gain']>; panner: InstanceType<ToneLibType['Panner']>; meter: InstanceType<ToneLibType['Meter']> }>();
  private pendingTrackStates = new Map<number, { volume?: number; pan?: number }>();
  private masterLimiter: InstanceType<ToneLibType['Limiter']> | null = null;

  private constructor() { }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) AudioEngine.instance = new AudioEngine();
    return AudioEngine.instance;
  }

  public async initialize(latencyHint: 'interactive' | 'balanced' | 'playback' = 'playback', lookAhead = 0.1) {
    // If we are already initialized and the context is running or valid, just resume if needed
    if (this._isInitialized && this.context) {
      if (this.context.state === 'suspended') {
        try { await this.context.resume(); } catch (e) { }
      }
      return;
    }

    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        this.currentLatencyHint = latencyHint;
        this.currentLookAhead = lookAhead;

        // 1. Load Tone.js
        if (!this.Tone) {
          this.Tone = await import('tone');
        }

        // 2. CRITICAL: Manually create the Context to ensure it's NATIVE.
        // This bypasses any Tone.js wrappers that might fail AudioWorkletNode type checks.
        if (!this.context) {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          this.context = new AudioContextClass({ latencyHint: this.currentLatencyHint });
          AudioEngine.contextCreationCount++;
          
          // Debug assertion: warn once if multiple contexts are created
          if (AudioEngine.contextCreationCount > 1 && !AudioEngine.hasWarnedMultipleContexts) {
            logger.warn(
              `[AudioEngine] Multiple AudioContext instances detected! Count: ${AudioEngine.contextCreationCount}`,
              'This may cause timing issues and resource waste.'
            );
            AudioEngine.hasWarnedMultipleContexts = true;
          }
        }

        // 3. Inject this native context into Tone.js
        this.Tone.setContext(this.context);

        // 4. Now start Tone (which resumes the context)
        await this.Tone.start();

        // 5. Ensure we are running
        if (this.context.state === 'suspended') {
          try { await this.context.resume(); } catch (e) { }
        }

        // 6. Create Master Gain with Limiter to prevent clipping
        // Chain: track channels → masterGain → limiter → destination
        this.masterGain = new this.Tone.Gain(1.0);
        try {
          this.masterLimiter = new this.Tone.Limiter(-1).toDestination();
          this.masterGain.connect(this.masterLimiter);
        } catch (e) {
          logger.error("Failed to create limiter, connecting directly to destination", e);
          this.masterGain.toDestination();
        }

        this._isInitialized = true;

        // Apply pending track states
        this.pendingTrackStates.forEach((state, id) => {
          if (state.volume !== undefined) this.updateTrackVolume(id, state.volume);
          if (state.pan !== undefined) this.updateTrackPan(id, state.pan);
        });
        this.pendingTrackStates.clear();

        logger.debug("AudioEngine initialized successfully with context state:", this.context.state);
      } catch (e) {
        this.initializationPromise = null; // Allow retry
        throw e;
      }
    })();

    return this.initializationPromise;
  }

  public getContext(): AudioContext {
    if (!this.context) throw new Error('AudioEngine not initialized (Context is null)');
    return this.context;
  }

  public getState(): AudioContextState | null { return this.context?.state || null; }

  public isReady(): boolean { return !!this.context && this._isInitialized; }

  public getNow(): number {
    // Always prefer Tone.now() to keep sync with instruments
    if (this.Tone && typeof this.Tone.now === 'function') return this.Tone.now();
    return this.context ? this.context.currentTime : 0;
  }

  public getTone(): ToneLibType | null { return this.Tone; }

  // Simplified Track Channel Management
  private trackFxNodes = new Map<number, { reverb: InstanceType<ToneLibType['Reverb']>; delay: InstanceType<ToneLibType['FeedbackDelay']>; eqLow: InstanceType<ToneLibType['Filter']>; eqMid: InstanceType<ToneLibType['Filter']>; eqHigh: InstanceType<ToneLibType['Filter']> }>();

  public getTrackChannel(trackId: number) {
    if (!this._isInitialized || !this.Tone) throw new Error('AudioEngine not initialized');

    if (this.trackChannels.has(trackId)) return this.trackChannels.get(trackId);

    // Create channel chain: Input -> EQ -> Reverb Send -> Delay Send -> Volume -> Panner -> Meter -> Master
    const input = new this.Tone.Gain(1.0);
    const volume = new this.Tone.Gain(1.0);
    const panner = new this.Tone.Panner(0);
<<<<<<< Updated upstream
    const meter = new this.Tone.Meter({ smoothing: 0.8 });

    // EQ: 3-band
    const eqLow = new this.Tone.Filter({ frequency: 320, type: 'lowshelf', gain: 0 });
    const eqMid = new this.Tone.Filter({ frequency: 1000, type: 'peaking', gain: 0, Q: 1 });
    const eqHigh = new this.Tone.Filter({ frequency: 3200, type: 'highshelf', gain: 0 });

    // FX sends (wet/dry via crossfade)
    const reverb = new this.Tone.Reverb({ decay: 2.5, preDelay: 0.01, wet: 0 });
    const delay = new this.Tone.FeedbackDelay({ delayTime: 0.3, feedback: 0.3, wet: 0 });
=======
    const meter = new this.Tone.Meter({ smoothing: 0.8, normalRange: false });
>>>>>>> Stashed changes

    // Connect chain
    input.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(reverb);
    reverb.connect(delay);
    delay.connect(volume);
    volume.connect(panner);
    panner.connect(meter);
    meter.connect(this.masterGain);

    const channel = { input, volume, panner, meter };
    this.trackChannels.set(trackId, channel);
    this.trackFxNodes.set(trackId, { reverb, delay, eqLow, eqMid, eqHigh });
    return channel;
  }

  public updateTrackVolume(trackId: number, value: number) {
    if (!this._isInitialized) {
      const s = this.pendingTrackStates.get(trackId) || {};
      s.volume = value;
      this.pendingTrackStates.set(trackId, s);
      return;
    }
    const ch = this.getTrackChannel(trackId);
    // Ramp to avoid clicks
    try { ch.volume.gain.rampTo(value, 0.05); } catch (e) { ch.volume.gain.value = value; }
  }

  public updateTrackPan(trackId: number, value: number) {
    if (!this._isInitialized) {
      const s = this.pendingTrackStates.get(trackId) || {};
      s.pan = value;
      this.pendingTrackStates.set(trackId, s);
      return;
    }
    const ch = this.getTrackChannel(trackId);
    try { ch.panner.pan.rampTo(value / 100, 0.05); } catch (e) { ch.panner.pan.value = value / 100; }
  }

<<<<<<< Updated upstream
  public updateTrackFX(trackId: number, fx: import('./types').TrackFX) {
    if (!this._isInitialized) return;
    const fxNodes = this.trackFxNodes.get(trackId);
    if (!fxNodes) {
      // Ensure channel is created first
      this.getTrackChannel(trackId);
      const nodes = this.trackFxNodes.get(trackId);
      if (!nodes) return;
      this.updateTrackFX(trackId, fx);
      return;
    }
    try {
      fxNodes.reverb.wet.rampTo(fx.reverbMix, 0.1);
      fxNodes.delay.wet.rampTo(fx.delayMix, 0.1);
      fxNodes.delay.delayTime.rampTo(fx.delayTime, 0.1);
      fxNodes.eqLow.gain.rampTo(fx.eqLow, 0.1);
      fxNodes.eqMid.gain.rampTo(fx.eqMid, 0.1);
      fxNodes.eqHigh.gain.rampTo(fx.eqHigh, 0.1);
    } catch (e) {
      logger.warn('Failed to update track FX:', e);
    }
  }

  /** Apply automation value at current beat */
  public applyAutomationAtBeat(tracks: import('./types').Track[], beat: number) {
    if (!this._isInitialized) return;
    for (const track of tracks) {
      if (!track.automation || track.muted) continue;
      for (const lane of track.automation) {
        if (lane.points.length < 2) continue;
        const sorted = lane.points;
        // Interpolate value at beat
        let value: number;
        if (beat <= sorted[0].beat) {
          value = sorted[0].value;
        } else if (beat >= sorted[sorted.length - 1].beat) {
          value = sorted[sorted.length - 1].value;
        } else {
          let i = 0;
          while (i < sorted.length - 1 && sorted[i + 1].beat < beat) i++;
          const p0 = sorted[i];
          const p1 = sorted[i + 1];
          const t = (beat - p0.beat) / (p1.beat - p0.beat);
          value = p0.value + (p1.value - p0.value) * t;
        }
        if (lane.param === 'volume') {
          this.updateTrackVolume(track.id, value);
        }
      }
    }
  }
=======
>>>>>>> Stashed changes
  public getTrackLevel(trackId: number): number {
    if (!this.context || !this._isInitialized) return 0;
    const ch = this.trackChannels.get(trackId);
    if (!ch) return 0;
    try {
      const v = ch.meter.getValue();
<<<<<<< Updated upstream
      // Tone.Meter returns number[] for stereo, number for mono
      const db = Array.isArray(v) ? Math.max(...v) : (typeof v === 'number' ? v : -100);
      return Math.max(0, Math.min(1, (db + 60) / 60));
    } catch { return 0; }
=======
      // getValue() returns number (mono) or number[] (stereo) in dB
      const db = Array.isArray(v) ? Math.max(...v) : (typeof v === 'number' ? v : -100);
      // Map -60dB→0, 0dB→1 (clamp)
      return Math.max(0, Math.min(1, (db + 60) / 60));
    } catch (e) { return 0; }
>>>>>>> Stashed changes
  }

  public getTrackLevels(): Record<number, number> {
    const out: Record<number, number> = {};
    if (!this.context || !this._isInitialized) return out;
<<<<<<< Updated upstream
    this.trackChannels.forEach((_ch, id: number) => {
=======
    this.trackChannels.forEach((_: any, id: number) => {
>>>>>>> Stashed changes
      out[id] = this.getTrackLevel(id);
    });
    return out;
  }

  /** Pre-warm channels for all given track IDs so meters are ready before playback */
  public preWarmChannels(trackIds: number[]): void {
    if (!this._isInitialized) return;
    trackIds.forEach(id => {
      if (!this.trackChannels.has(id)) this.getTrackChannel(id);
    });
  }

  public async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
      this.notifyStateChange();
    }
  }

  public async suspend() {
    if (this.context && this.context.state === 'running') {
      await this.context.suspend();
      this.notifyStateChange();
    }
  }

  // State Change Listener Support
  private stateListeners: ((state: AudioContextState) => void)[] = [];

  public onStateChange(callback: (state: AudioContextState) => void) {
    if (this.stateListeners.includes(callback)) return;
    this.stateListeners.push(callback);
    // Immediate callback with current state
    if (this.context) callback(this.context.state);
  }

  public removeStateListener(callback: (state: AudioContextState) => void) {
    this.stateListeners = this.stateListeners.filter(cb => cb !== callback);
  }

  private notifyStateChange() {
    if (this.context) {
      const state = this.context.state;
      this.stateListeners.forEach(cb => cb(state));
    }
  }

  // DEVICE MANAGEMENT FOR SETTINGS MODAL
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices;
    } catch (e) {
      logger.error('Failed to enumerate devices:', e);
      return [];
    }
  }

  public async setOutputDevice(deviceId: string): Promise<void> {
    // Note: Output device selection requires experimental APIs
    // Modern browsers support setSinkId on audio elements
    logger.debug('Setting output device to:', deviceId);
  }

  public async playTestTone(): Promise<void> {
    await this.initialize();
    if (!this.context || !this.Tone) return;

    try {
      const osc = new this.Tone.Oscillator({ type: 'sine', frequency: 440 });
      osc.toDestination();
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.dispose();
      }, 500);
    } catch (e) {
      logger.error('Failed to play test tone:', e);
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      logger.error('Failed to get audio permissions:', e);
      return false;
    }
  }

<<<<<<< Updated upstream
  // ============================================================
  // METRONOME
  // ============================================================
  private metronomeEnabled = false;

  public setMetronome(enabled: boolean) {
    this.metronomeEnabled = enabled;
  }

  public isMetronomeEnabled(): boolean {
    return this.metronomeEnabled;
  }

  public playMetronomeClick(time: number, isDownbeat: boolean) {
    if (!this.metronomeEnabled || !this.context || this.context.state !== 'running') return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.frequency.value = isDownbeat ? 1000 : 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain).connect(this.context.destination);
      osc.start(time);
      osc.stop(time + 0.05);
    } catch (e) {
      logger.error('Failed to play metronome click:', e);
    }
  }

  // ============================================================
  // AUDIO RECORDING
  // ============================================================
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStream: MediaStream | null = null;

  public async startRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;

    // Get mic access
    this.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick best supported format
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg';

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.recordingStream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start(100); // Collect data every 100ms
    logger.debug('[AudioEngine] Recording started');
  }

  public async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder!.mimeType });
        this.recordedChunks = [];
        // Stop mic stream
        this.recordingStream?.getTracks().forEach(t => t.stop());
        this.recordingStream = null;
        logger.debug('[AudioEngine] Recording stopped, size:', blob.size);
        resolve(blob);
      };
      this.mediaRecorder!.stop();
=======
  // ── AUDIO RECORDING ──────────────────────────────────────────────────────────
  private recorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private recordingStream: MediaStream | null = null;

  /** Start recording from the default microphone. Resolves immediately. */
  public async startRecording(): Promise<void> {
    if (this.recorder && this.recorder.state === 'recording') return;

    this.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.recordingChunks = [];

    // Prefer WAV-capable format, fall back gracefully
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')
      ? 'audio/webm;codecs=pcm'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    this.recorder = mimeType ? new MediaRecorder(this.recordingStream, { mimeType }) : new MediaRecorder(this.recordingStream);

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordingChunks.push(e.data);
    };

    this.recorder.start(100); // Collect chunks every 100ms
  }

  /** Stop recording. Returns a Blob (audio/webm or audio/wav). */
  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.recorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.recorder.onstop = () => {
        const blob = new Blob(this.recordingChunks, { type: this.recorder?.mimeType || 'audio/webm' });
        // Release mic
        this.recordingStream?.getTracks().forEach(t => t.stop());
        this.recordingStream = null;
        this.recordingChunks = [];
        resolve(blob);
      };

      this.recorder.stop();
>>>>>>> Stashed changes
    });
  }

  public isRecording(): boolean {
<<<<<<< Updated upstream
    return this.mediaRecorder?.state === 'recording';
=======
    return this.recorder?.state === 'recording';
>>>>>>> Stashed changes
  }

  public updatePerformanceSettings(latencyHint: 'interactive' | 'balanced' | 'playback', lookAhead: number): void {
    // TODO: Apply latencyHint/lookAhead to the live AudioContext or Tone.js Transport scheduler
    // Currently only stored for use on next context creation
    this.currentLatencyHint = latencyHint;
    this.currentLookAhead = lookAhead;
    logger.debug('Performance settings updated:', { latencyHint, lookAhead });
  }
  
  /**
   * Preload an audio clip and return a Promise
   * Centralizes audio clip preloading with proper error handling
   */
  public async preloadAudioClip(url: string): Promise<AudioBuffer> {
    if (!this.context) {
      await this.initialize();
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  // Debug utility: Get the count of AudioContext creations
  public static getContextCreationCount(): number {
    return AudioEngine.contextCreationCount;
  }

  // Debug utility: Assert only one context exists
  public static assertSingleContext(): boolean {
    if (AudioEngine.contextCreationCount > 1) {
      logger.error(
        `[AudioEngine] ASSERTION FAILED: Multiple AudioContext instances created (${AudioEngine.contextCreationCount})!`,
        'Only one AudioContext should exist for the entire application.'
      );
      return false;
    }
    return true;
  }

  // REGISTER SCHEDULER WORKLET
  // Completely rewritten to be simple and safe. No SharedArrayBuffer.
  // This Worklet acts as a stable METRONOME independent of the main thread.
  public async registerSchedulerWorklet(): Promise<{ node: AudioWorkletNode } | null> {
    if (!this.context) return null;

    // Defines the processor code as a string to avoid external file loading issues
    // Uses standard port messaging for maximum compatibility.
    const processorCode = `
      class SchedulerProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this._nextTick = 0;
          this._interval = 0.025; // 25ms default (matches SCHEDULER_INTERVAL)
          this._running = false;
          
          this.port.onmessage = (event) => {
             if (event.data.type === 'start') this._running = true;
             if (event.data.type === 'stop') this._running = false;
             if (event.data.type === 'setTick' || event.data.type === 'reset') {
                 // Reset next tick timing to now to ensure immediate scheduling
                 this._nextTick = currentTime;
             }
             if (event.data.interval) this._interval = event.data.interval;
          };
        }

        process(inputs, outputs, parameters) {
          if (!this._running) return true;

          const now = currentTime;
          
          if (now >= this._nextTick) {
             this.port.postMessage({ type: 'tick', time: now });
             // Advance next tick time
             // If we fell way behind (e.g. system sleep), reset to now + interval
             if (now - this._nextTick > 0.1) {
                this._nextTick = now + this._interval;
             } else {
                this._nextTick += this._interval;
             }
          }

          return true;
        }
      }

      registerProcessor('scheduler-processor', SchedulerProcessor);
    `;

    try {
      const blob = new Blob([processorCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const node = new AudioWorkletNode(this.context, 'scheduler-processor');

      // Prevent GC
      node.connect(this.context.destination);

      return { node };

    } catch (e) {
      logger.error("Failed to register scheduler worklet:", e);
      return null;
    }
  }

  // =============================================
  // EXPORT: Render project to WAV blob
  // =============================================
  public async exportToWav(
    tracks: import('./types').Track[],
    tempo: number,
    durationBeats: number,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    if (!this.context) await this.initialize();
    const Tone = this.Tone;
    if (!Tone) throw new Error('Tone.js not loaded');

    const secondsPerBeat = 60 / tempo;
    const totalSeconds = durationBeats * secondsPerBeat + 2; // +2s tail for reverb
    const sampleRate = this.context!.sampleRate || 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalSeconds * sampleRate), sampleRate);

    // Schedule all track notes into the offline context
    for (const track of tracks) {
      if (track.muted) continue;
      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = track.volume;
      const panNode = offlineCtx.createStereoPanner();
      panNode.pan.value = track.pan / 100;
      gainNode.connect(panNode).connect(offlineCtx.destination);

      for (const clip of track.clips) {
        if (clip.notes) {
          for (const note of clip.notes) {
            const startTime = (clip.start + note.start) * secondsPerBeat;
            const dur = note.duration * secondsPerBeat;
            if (startTime >= totalSeconds) continue;
            // Simple synthesis for export
            const osc = offlineCtx.createOscillator();
            const env = offlineCtx.createGain();
            osc.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12);
            osc.type = track.type === 'drums' ? 'triangle' : 'sawtooth';
            env.gain.setValueAtTime(0, startTime);
            env.gain.linearRampToValueAtTime(note.velocity * 0.3, startTime + 0.01);
            env.gain.linearRampToValueAtTime(0, startTime + dur);
            osc.connect(env).connect(gainNode);
            osc.start(startTime);
            osc.stop(startTime + dur + 0.05);
          }
        }
        if (clip.audioUrl) {
          try {
            const resp = await fetch(clip.audioUrl);
            const buf = await resp.arrayBuffer();
            const audioBuf = await offlineCtx.decodeAudioData(buf);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuf;
            source.connect(gainNode);
            const startTime = clip.start * secondsPerBeat;
            source.start(startTime);
          } catch (e) { logger.warn('Skipping audio clip in export:', e); }
        }
      }
    }

    onProgress?.(30);
    const renderedBuffer = await offlineCtx.startRendering();
    onProgress?.(80);

    // Encode to WAV
    const wavBlob = this.encodeWav(renderedBuffer);
    onProgress?.(100);
    return wavBlob;
  }

  private encodeWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2; // 16-bit
    const dataLength = length * numChannels * bytesPerSample;
    const headerLength = 44;
    const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // =============================================
  // MIDI INPUT: Web MIDI API integration
  // =============================================
  private midiAccess: MIDIAccess | null = null;
  private midiInputListeners: ((note: number, velocity: number, channel: number) => void)[] = [];
  private activeMidiInputs: MIDIInput[] = [];

  public async getMidiDevices(): Promise<{ inputs: MIDIInput[]; outputs: MIDIOutput[] }> {
    if (!navigator.requestMIDIAccess) {
      return { inputs: [], outputs: [] };
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      const inputs = Array.from(this.midiAccess.inputs.values());
      const outputs = Array.from(this.midiAccess.outputs.values());
      return { inputs, outputs };
    } catch (e) {
      logger.warn('Web MIDI not available:', e);
      return { inputs: [], outputs: [] };
    }
  }

  public onMidiNote(callback: (note: number, velocity: number, channel: number) => void) {
    this.midiInputListeners.push(callback);
    return () => {
      this.midiInputListeners = this.midiInputListeners.filter(cb => cb !== callback);
    };
  }

  public connectMidiInput(input: MIDIInput) {
    input.onmidimessage = (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data || data.length < 3) return;
      const status = data[0] & 0xf0;
      const channel = data[0] & 0x0f;
      const note = data[1];
      const velocity = data[2] / 127;
      // Note On
      if (status === 0x90 && velocity > 0) {
        this.midiInputListeners.forEach(cb => cb(note, velocity, channel));
      }
    };
    this.activeMidiInputs.push(input);
  }

  public disconnectAllMidiInputs() {
    this.activeMidiInputs.forEach(input => { input.onmidimessage = null; });
    this.activeMidiInputs = [];
  }

  public getMasterVolume(): number {
    if (this.masterGain) {
      return this.masterGain.gain.value;
    }
    return 1;
  }

  public setMasterVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }

  public dispose(): void {
    for (const [, channel] of this.trackChannels) {
      try {
        channel.input.dispose();
        channel.volume.dispose();
        channel.panner.dispose();
        channel.meter.dispose();
      } catch {
        // Already disposed
      }
    }
    for (const [, fx] of this.trackFxNodes) {
      try {
        fx.reverb.dispose();
        fx.delay.dispose();
        fx.eqLow.dispose();
        fx.eqMid.dispose();
        fx.eqHigh.dispose();
      } catch {
        // Already disposed
      }
    }
    this.trackChannels.clear();
    this.trackFxNodes.clear();

    if (this.masterLimiter) {
      this.masterLimiter.dispose();
      this.masterLimiter = null;
    }
    if (this.masterGain) {
      this.masterGain.dispose();
      this.masterGain = null;
    }

    this._isInitialized = false;
  }
}

export const audioEngine = AudioEngine.getInstance();
