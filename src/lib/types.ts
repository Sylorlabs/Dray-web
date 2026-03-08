// Consolidated TypeScript types for Drey DAW
// Single source of truth - eliminates duplicate interfaces

// ============================================
// TRACKS & CLIPS
// ============================================
export type TrackType = 'audio' | 'midi' | 'drums';

export interface MidiNote {
    id: string;
    pitch: number;      // MIDI note number (0-127)
    start: number;      // Start time in beats
    duration: number;   // Duration in beats
    velocity: number;   // 0-1
}

// Alias for backwards compatibility
export type Note = MidiNote;

export interface AudioWaveform {
    peaks: number[];
}

export interface Clip {
    id?: string;
    start: number;      // Start position in beats
    duration: number;   // Duration in beats
    name: string;
    notes?: MidiNote[];
    waveform?: AudioWaveform;
    audioUrl?: string;
    gain?: number;
    pitch?: number;
    reverse?: boolean;
}

export interface TrackFX {
    reverbMix: number;  // 0-1
    delayMix: number;   // 0-1
    delayTime: number;  // seconds
    eqLow: number;      // -12 to 12 dB
    eqMid: number;      // -12 to 12 dB
    eqHigh: number;     // -12 to 12 dB
}

export const DEFAULT_TRACK_FX: TrackFX = {
    reverbMix: 0,
    delayMix: 0,
    delayTime: 0.3,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
};

export interface AutomationPoint {
    beat: number;       // Position in beats
    value: number;      // 0-1 normalized
}

export type AutomationParam = 'volume' | 'pan';

export interface AutomationLane {
    param: AutomationParam;
    points: AutomationPoint[];
}

export interface Track {
    id: number;
    projectId?: number;
    name: string;
    type: TrackType;
    color: string;
    volume: number;     // 0-1
    pan: number;        // -100 to 100
    muted: boolean;
    soloed: boolean;
    meterL: number;     // 0-1 (for visualization)
    meterR: number;     // 0-1 (for visualization)
    instrument?: string;
    clips: Clip[];
    fx?: TrackFX;
    automation?: AutomationLane[];
}

// ============================================
// PROJECT
// ============================================
export interface Project {
    id?: number;
    name: string;
    createdAt: number;
    updatedAt: number;
    tempo: number;
    timeSignature: string;
    loopStart?: number;
    loopEnd?: number;
    isLooping?: boolean;
}

// ============================================
// SOUND CATEGORIES
// ============================================
export type SoundCategory = 'Drums' | 'Bass' | 'Synths' | 'Keys' | 'FX' | 'Vocals' | 'Leads' | 'Pads' | 'Bells' | 'Arps' | 'Textures';

// Map from sound category to track type
export const SOUND_TYPE_MAP: Record<SoundCategory, TrackType> = {
    Drums: 'drums',
    Bass: 'midi',
    Synths: 'midi',
    Keys: 'midi',
    FX: 'audio',
    Vocals: 'audio',
    Leads: 'midi',
    Pads: 'midi',
    Bells: 'midi',
    Arps: 'midi',
    Textures: 'midi'
};

// ============================================
// WINGMAN AI
// ============================================
export interface WingmanMessage {
    role: 'ai' | 'user';
    text: string;
}

export interface WingmanAction {
    type: string;
    payload: Record<string, any>;
}

export interface WingmanResponse {
    content: string;
    actions?: WingmanAction[];
}

// ============================================
// SYNTH ENGINE
// ============================================
export type OscillatorWaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface SynthPreset {
    name: string;
    oscillators: {
        type: OscillatorWaveType;
        detune: number;
        gain: number;
    }[];
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    filterFreq: number;
    filterQ: number;
    reverbMix: number;
}

export interface Voice {
    id: number;
    oscillators: OscillatorNode[];
    gains: GainNode[];
    filter: BiquadFilterNode;
    envelope: GainNode;
    stopTime: number;
    isReleasing: boolean;
    midiNote: number;       // Track which note this voice is playing
    isActive: boolean;      // For voice pooling
}

// ============================================
// SCHEDULER
// ============================================
export interface ScheduledNote {
    note: number;
    time: number;
}

export interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    currentBeat: number;
}
