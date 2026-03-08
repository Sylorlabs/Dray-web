import { logger } from '../logger';

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface SynthPreset {
    name: string;
    category: 'Lead' | 'Pad' | 'Bass' | 'Keys' | 'Bell' | 'Arp' | 'FX' | 'Texture';
    oscillators: { type: OscillatorType; detune: number; gain: number }[];
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    filterFreq: number;
    filterQ: number;
    reverbMix: number;
    // Effects
    chorus?: { rate: number; depth: number; mix: number };
    delay?: { time: number; feedback: number; mix: number };
    // Modulation
    lfo?: { type: 'sine' | 'triangle'; rate: number; target: 'filter' | 'pitch'; amount: number };
    // Additional sound design params
    useFM?: boolean;
    fmRatio?: number;
    fmDepth?: number;
    useNoise?: boolean;
    noiseAmount?: number;
    noiseType?: 'white' | 'pink' | 'brown';
}

export const SYNTH_PRESETS: SynthPreset[] = [
    // ═══════════════════════════════════════════════════════════════════════════
    // LEADS - Cutting, melodic synth sounds
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Super Saw',
        category: 'Lead',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.35 },
            { type: 'sawtooth', detune: 7, gain: 0.22 },
            { type: 'sawtooth', detune: -7, gain: 0.22 },
            { type: 'sawtooth', detune: 14, gain: 0.12 },
            { type: 'sawtooth', detune: -14, gain: 0.12 },
            { type: 'sawtooth', detune: 21, gain: 0.08 },
            { type: 'sawtooth', detune: -21, gain: 0.08 },
        ],
        attack: 0.01, decay: 0.2, sustain: 0.75, release: 0.25, filterFreq: 6000, filterQ: 1.2, reverbMix: 0.3,
        chorus: { rate: 1.8, depth: 0.7, mix: 0.4 },
        delay: { time: 0.18, feedback: 0.25, mix: 0.18 },
        lfo: { type: 'sine', rate: 0.18, target: 'filter', amount: 1200 }
    },
    {
        name: 'Bright Lead',
        category: 'Lead',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.45 },
            { type: 'square', detune: 3, gain: 0.25 },
            { type: 'sawtooth', detune: -3, gain: 0.2 },
        ],
        attack: 0.005, decay: 0.1, sustain: 0.85, release: 0.2, filterFreq: 8000, filterQ: 1.5, reverbMix: 0.15,
        delay: { time: 0.22, feedback: 0.3, mix: 0.22 }
    },
    {
        name: 'Trance Lead',
        category: 'Lead',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.38 },
            { type: 'sawtooth', detune: 8, gain: 0.28 },
            { type: 'sawtooth', detune: -8, gain: 0.28 },
            { type: 'square', detune: 0, gain: 0.12 },
        ],
        attack: 0.01, decay: 0.5, sustain: 0.65, release: 0.35, filterFreq: 7000, filterQ: 1.8, reverbMix: 0.35
    },
    {
        name: 'Pluck Lead',
        category: 'Lead',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.5 },
            { type: 'square', detune: 5, gain: 0.3 },
        ],
        attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.08, filterFreq: 5000, filterQ: 2.5, reverbMix: 0.2
    },
    {
        name: 'FM Lead',
        category: 'Lead',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.5 },
            { type: 'sine', detune: 1200, gain: 0.3 },
        ],
        attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.25, filterFreq: 8000, filterQ: 1, reverbMix: 0.2,
        useFM: true, fmRatio: 3, fmDepth: 15,
        delay: { time: 0.15, feedback: 0.2, mix: 0.15 }
    },
    {
        name: 'Portamento Lead',
        category: 'Lead',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.4 },
            { type: 'square', detune: 0, gain: 0.3 },
        ],
        attack: 0.02, decay: 0.15, sustain: 0.8, release: 0.3, filterFreq: 4000, filterQ: 4, reverbMix: 0.25,
        lfo: { type: 'triangle', rate: 5.5, target: 'pitch', amount: 10 }
    },
    {
        name: 'Distorted Lead',
        category: 'Lead',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.55 },
            { type: 'square', detune: 5, gain: 0.35 },
        ],
        attack: 0.001, decay: 0.1, sustain: 0.9, release: 0.15, filterFreq: 6000, filterQ: 3, reverbMix: 0.1
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PADS - Evolving, atmospheric textures
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Analog Pad',
        category: 'Pad',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.3 },
            { type: 'sawtooth', detune: 5, gain: 0.22 },
            { type: 'sawtooth', detune: -5, gain: 0.22 },
            { type: 'triangle', detune: 0, gain: 0.2 },
        ],
        attack: 0.8, decay: 0.5, sustain: 0.7, release: 1.2, filterFreq: 2800, filterQ: 0.7, reverbMix: 0.45,
        chorus: { rate: 0.8, depth: 0.5, mix: 0.3 },
        lfo: { type: 'triangle', rate: 0.12, target: 'filter', amount: 800 }
    },
    {
        name: 'String Pad',
        category: 'Pad',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.32 },
            { type: 'sawtooth', detune: 6, gain: 0.24 },
            { type: 'sawtooth', detune: -6, gain: 0.24 },
            { type: 'sawtooth', detune: 12, gain: 0.1 },
            { type: 'sawtooth', detune: -12, gain: 0.1 },
        ],
        attack: 0.6, decay: 0.4, sustain: 0.8, release: 1.0, filterFreq: 4500, filterQ: 0.6, reverbMix: 0.4
    },
    {
        name: 'Crystal Pad',
        category: 'Pad',
        oscillators: [
            { type: 'triangle', detune: 0, gain: 0.35 },
            { type: 'sine', detune: 1200, gain: 0.2 },
            { type: 'sine', detune: -1200, gain: 0.15 },
            { type: 'sawtooth', detune: 5, gain: 0.12 },
        ],
        attack: 1.2, decay: 0.8, sustain: 0.65, release: 2.0, filterFreq: 4000, filterQ: 0.5, reverbMix: 0.55
    },
    {
        name: 'Atmosphere',
        category: 'Pad',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.35 },
            { type: 'triangle', detune: 3, gain: 0.25 },
            { type: 'sine', detune: 7, gain: 0.2 },
            { type: 'sine', detune: -5, gain: 0.15 },
        ],
        attack: 1.5, decay: 0.8, sustain: 0.6, release: 2.5, filterFreq: 3500, filterQ: 0.4, reverbMix: 0.6
    },
    {
        name: 'Dark Pad',
        category: 'Pad',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.35 },
            { type: 'square', detune: -5, gain: 0.25 },
            { type: 'triangle', detune: 3, gain: 0.2 },
        ],
        attack: 1.0, decay: 0.6, sustain: 0.5, release: 1.8, filterFreq: 1500, filterQ: 1, reverbMix: 0.5,
        lfo: { type: 'sine', rate: 0.08, target: 'filter', amount: 600 }
    },
    {
        name: 'Noise Pad',
        category: 'Pad',
        oscillators: [
            { type: 'triangle', detune: 0, gain: 0.35 },
            { type: 'sine', detune: 7, gain: 0.25 },
        ],
        attack: 2.0, decay: 1.0, sustain: 0.5, release: 3.0, filterFreq: 2000, filterQ: 0.5, reverbMix: 0.65,
        useNoise: true, noiseAmount: 0.15, noiseType: 'pink'
    },
    {
        name: 'Warm Pad',
        category: 'Pad',
        oscillators: [
            { type: 'triangle', detune: 0, gain: 0.4 },
            { type: 'sine', detune: 5, gain: 0.3 },
            { type: 'sine', detune: -5, gain: 0.2 },
        ],
        attack: 0.8, decay: 0.5, sustain: 0.75, release: 1.5, filterFreq: 2200, filterQ: 0.3, reverbMix: 0.4,
        chorus: { rate: 0.5, depth: 0.4, mix: 0.25 }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // BASS - Low-end synthesis (also covered by Bass Engine)
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Sub Bass',
        category: 'Bass',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.85 },
            { type: 'triangle', detune: 0, gain: 0.15 },
        ],
        attack: 0.005, decay: 0.05, sustain: 0.95, release: 0.1, filterFreq: 300, filterQ: 0.3, reverbMix: 0.0
    },
    {
        name: 'Reese Bass',
        category: 'Bass',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.45 },
            { type: 'sawtooth', detune: 8, gain: 0.35 },
            { type: 'sawtooth', detune: -8, gain: 0.35 },
        ],
        attack: 0.01, decay: 0.1, sustain: 0.85, release: 0.12, filterFreq: 1200, filterQ: 2, reverbMix: 0.05
    },
    {
        name: '808 Bass',
        category: 'Bass',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.9 },
            { type: 'triangle', detune: 0, gain: 0.1 },
        ],
        attack: 0.001, decay: 0.8, sustain: 0.3, release: 0.3, filterFreq: 400, filterQ: 0.5, reverbMix: 0.0
    },
    {
        name: 'Acid Bass',
        category: 'Bass',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.75 },
            { type: 'square', detune: 0, gain: 0.25 },
        ],
        attack: 0.005, decay: 0.15, sustain: 0.25, release: 0.08, filterFreq: 1800, filterQ: 12, reverbMix: 0.1
    },
    {
        name: 'FM Bass',
        category: 'Bass',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.6 },
            { type: 'sine', detune: 1200, gain: 0.25 },
            { type: 'triangle', detune: 0, gain: 0.15 },
        ],
        attack: 0.001, decay: 0.2, sustain: 0.5, release: 0.1, filterFreq: 600, filterQ: 1.5, reverbMix: 0.05,
        useFM: true, fmRatio: 2, fmDepth: 10
    },
    {
        name: 'Wobble Bass',
        category: 'Bass',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.6 },
            { type: 'square', detune: 0, gain: 0.3 },
        ],
        attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1, filterFreq: 500, filterQ: 8, reverbMix: 0.05,
        lfo: { type: 'sine', rate: 4, target: 'filter', amount: 2000 }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // KEYS - Keyboard instruments (also covered by Keys Engine)
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Electric Piano',
        category: 'Keys',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.5 },
            { type: 'sine', detune: 1200, gain: 0.2 },
            { type: 'triangle', detune: 0, gain: 0.2 },
        ],
        attack: 0.001, decay: 0.8, sustain: 0.3, release: 0.5, filterFreq: 3000, filterQ: 0.5, reverbMix: 0.25,
        useFM: true, fmRatio: 3, fmDepth: 12
    },
    {
        name: 'Warm Keys',
        category: 'Keys',
        oscillators: [
            { type: 'triangle', detune: 0, gain: 0.5 },
            { type: 'sine', detune: 0, gain: 0.4 },
            { type: 'sine', detune: 5, gain: 0.1 },
        ],
        attack: 0.01, decay: 0.4, sustain: 0.45, release: 0.4, filterFreq: 2200, filterQ: 0.4, reverbMix: 0.25
    },
    {
        name: 'Lofi Keys',
        category: 'Keys',
        oscillators: [
            { type: 'triangle', detune: 0, gain: 0.55 },
            { type: 'sine', detune: 8, gain: 0.25 },
            { type: 'sine', detune: -6, gain: 0.15 },
        ],
        attack: 0.015, decay: 0.5, sustain: 0.35, release: 0.6, filterFreq: 1400, filterQ: 0.3, reverbMix: 0.15
    },
    {
        name: 'Synth Organ',
        category: 'Keys',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.4 },
            { type: 'sine', detune: 1200, gain: 0.25 },
            { type: 'sine', detune: 1900, gain: 0.15 },
            { type: 'sine', detune: 2400, gain: 0.1 },
        ],
        attack: 0.02, decay: 0.05, sustain: 0.85, release: 0.08, filterFreq: 5000, filterQ: 0.4, reverbMix: 0.3
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // BELLS & PLUCKS - Percussive melodic sounds
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Bell',
        category: 'Bell',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.4 },
            { type: 'sine', detune: 1200, gain: 0.22 },
            { type: 'sine', detune: 2400, gain: 0.12 },
            { type: 'sine', detune: 3600, gain: 0.06 },
        ],
        attack: 0.001, decay: 1.8, sustain: 0.0, release: 1.5, filterFreq: 8000, filterQ: 0.6, reverbMix: 0.45,
        useFM: true, fmRatio: 5, fmDepth: 8
    },
    {
        name: 'FM Bell',
        category: 'Bell',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.5 },
            { type: 'sine', detune: 700, gain: 0.3 },
        ],
        attack: 0.001, decay: 2.0, sustain: 0.0, release: 1.8, filterFreq: 10000, filterQ: 0.4, reverbMix: 0.5,
        useFM: true, fmRatio: 7, fmDepth: 20,
        delay: { time: 0.3, feedback: 0.3, mix: 0.2 }
    },
    {
        name: 'Glass Bell',
        category: 'Bell',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.4 },
            { type: 'triangle', detune: 1200, gain: 0.25 },
            { type: 'sine', detune: 2800, gain: 0.15 },
        ],
        attack: 0.001, decay: 2.5, sustain: 0.0, release: 2.0, filterFreq: 12000, filterQ: 0.3, reverbMix: 0.6
    },
    {
        name: 'Plucked Strings',
        category: 'Bell',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.45 },
            { type: 'triangle', detune: 0, gain: 0.35 },
            { type: 'square', detune: 5, gain: 0.1 },
        ],
        attack: 0.002, decay: 0.25, sustain: 0.0, release: 0.2, filterFreq: 3500, filterQ: 1.2, reverbMix: 0.3
    },
    {
        name: 'Marimba',
        category: 'Bell',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.55 },
            { type: 'triangle', detune: 0, gain: 0.3 },
            { type: 'sine', detune: 2400, gain: 0.1 },
        ],
        attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.3, filterFreq: 4000, filterQ: 0.8, reverbMix: 0.2
    },
    {
        name: 'Kalimba',
        category: 'Bell',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.5 },
            { type: 'triangle', detune: 1200, gain: 0.2 },
            { type: 'sine', detune: 2400, gain: 0.1 },
        ],
        attack: 0.001, decay: 1.5, sustain: 0.0, release: 1.0, filterFreq: 5000, filterQ: 1, reverbMix: 0.35
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ARPS & SEQUENCES - Short, snappy for patterns
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Arp Synth',
        category: 'Arp',
        oscillators: [
            { type: 'square', detune: 0, gain: 0.4 },
            { type: 'sawtooth', detune: 6, gain: 0.3 },
            { type: 'sawtooth', detune: -6, gain: 0.2 },
        ],
        attack: 0.002, decay: 0.08, sustain: 0.35, release: 0.06, filterFreq: 5500, filterQ: 2.2, reverbMix: 0.22
    },
    {
        name: 'Chiptune',
        category: 'Arp',
        oscillators: [
            { type: 'square', detune: 0, gain: 0.75 },
            { type: 'square', detune: 1200, gain: 0.15 },
        ],
        attack: 0.001, decay: 0.08, sustain: 0.5, release: 0.03, filterFreq: 12000, filterQ: 0.1, reverbMix: 0.0
    },
    {
        name: 'Stab',
        category: 'Arp',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.4 },
            { type: 'sawtooth', detune: 5, gain: 0.3 },
            { type: 'square', detune: 0, gain: 0.2 },
        ],
        attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.05, filterFreq: 4000, filterQ: 3, reverbMix: 0.15
    },
    {
        name: 'Future Bass Chord',
        category: 'Arp',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.35 },
            { type: 'sawtooth', detune: 7, gain: 0.25 },
            { type: 'sawtooth', detune: -7, gain: 0.25 },
            { type: 'square', detune: 0, gain: 0.15 },
        ],
        attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.2, filterFreq: 3000, filterQ: 2, reverbMix: 0.3,
        lfo: { type: 'sine', rate: 1.5, target: 'filter', amount: 1500 }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FX & SPECIAL - Unique textures and effects
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'Sci-Fi Riser',
        category: 'FX',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.45 },
            { type: 'square', detune: 3, gain: 0.35 },
            { type: 'sawtooth', detune: -3, gain: 0.2 },
        ],
        attack: 2.5, decay: 0.0, sustain: 1.0, release: 0.3, filterFreq: 7000, filterQ: 2.5, reverbMix: 0.4
    },
    {
        name: 'Formant Choir',
        category: 'FX',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.35 },
            { type: 'sawtooth', detune: 5, gain: 0.25 },
            { type: 'sawtooth', detune: -5, gain: 0.25 },
            { type: 'triangle', detune: 0, gain: 0.15 },
        ],
        attack: 0.8, decay: 0.6, sustain: 0.65, release: 1.5, filterFreq: 1200, filterQ: 8, reverbMix: 0.55,
        chorus: { rate: 0.5, depth: 0.6, mix: 0.4 },
        lfo: { type: 'triangle', rate: 5.5, target: 'pitch', amount: 8 }
    },
    {
        name: 'Retro Brass',
        category: 'FX',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.55 },
            { type: 'sawtooth', detune: 4, gain: 0.25 },
            { type: 'triangle', detune: 0, gain: 0.15 },
        ],
        attack: 0.08, decay: 0.15, sustain: 0.65, release: 0.25, filterFreq: 3000, filterQ: 1.2, reverbMix: 0.2
    },
    {
        name: 'Tape Whistle',
        category: 'FX',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.6 },
            { type: 'triangle', detune: 0, gain: 0.25 },
        ],
        attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.4, filterFreq: 4000, filterQ: 1, reverbMix: 0.3,
        lfo: { type: 'sine', rate: 4, target: 'pitch', amount: 15 }
    },
    {
        name: 'Laser',
        category: 'FX',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.5 },
            { type: 'square', detune: 0, gain: 0.3 },
        ],
        attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.1, filterFreq: 8000, filterQ: 5, reverbMix: 0.2,
        lfo: { type: 'sine', rate: 20, target: 'pitch', amount: 100 }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // TEXTURES - Ambient and noise-based
    // ═══════════════════════════════════════════════════════════════════════════
    {
        name: 'White Noise Pad',
        category: 'Texture',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.2 },
        ],
        attack: 2.0, decay: 1.0, sustain: 0.4, release: 3.0, filterFreq: 2000, filterQ: 0.5, reverbMix: 0.7,
        useNoise: true, noiseAmount: 0.6, noiseType: 'white'
    },
    {
        name: 'Ocean Waves',
        category: 'Texture',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.15 },
            { type: 'triangle', detune: 5, gain: 0.1 },
        ],
        attack: 3.0, decay: 2.0, sustain: 0.3, release: 4.0, filterFreq: 800, filterQ: 0.3, reverbMix: 0.75,
        useNoise: true, noiseAmount: 0.7, noiseType: 'brown',
        lfo: { type: 'sine', rate: 0.1, target: 'filter', amount: 500 }
    },
    {
        name: 'Wind',
        category: 'Texture',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.1 },
        ],
        attack: 2.5, decay: 1.5, sustain: 0.5, release: 3.5, filterFreq: 3000, filterQ: 1, reverbMix: 0.6,
        useNoise: true, noiseAmount: 0.8, noiseType: 'pink',
        lfo: { type: 'triangle', rate: 0.15, target: 'filter', amount: 1500 }
    },
    {
        name: 'Digital Glitch',
        category: 'Texture',
        oscillators: [
            { type: 'square', detune: 0, gain: 0.4 },
            { type: 'sawtooth', detune: 50, gain: 0.3 },
        ],
        attack: 0.001, decay: 0.05, sustain: 0.8, release: 0.02, filterFreq: 6000, filterQ: 4, reverbMix: 0.1,
        useNoise: true, noiseAmount: 0.2, noiseType: 'white'
    },
    {
        name: 'Shimmer',
        category: 'Texture',
        oscillators: [
            { type: 'sine', detune: 0, gain: 0.3 },
            { type: 'sine', detune: 1200, gain: 0.2 },
            { type: 'triangle', detune: 2400, gain: 0.15 },
        ],
        attack: 1.5, decay: 1.0, sustain: 0.5, release: 2.5, filterFreq: 6000, filterQ: 0.5, reverbMix: 0.7,
        delay: { time: 0.4, feedback: 0.5, mix: 0.35 },
        lfo: { type: 'sine', rate: 0.08, target: 'filter', amount: 2000 }
    },
    {
        name: 'Drone',
        category: 'Texture',
        oscillators: [
            { type: 'sawtooth', detune: 0, gain: 0.25 },
            { type: 'sawtooth', detune: 2, gain: 0.2 },
            { type: 'sawtooth', detune: -2, gain: 0.2 },
            { type: 'sine', detune: -1200, gain: 0.25 },
        ],
        attack: 3.0, decay: 2.0, sustain: 0.7, release: 4.0, filterFreq: 1500, filterQ: 0.5, reverbMix: 0.6,
        lfo: { type: 'triangle', rate: 0.05, target: 'filter', amount: 800 }
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getPresetNames(): string[] {
    return SYNTH_PRESETS.map(p => p.name);
}

export function getPresetsByCategory(category: SynthPreset['category']): SynthPreset[] {
    return SYNTH_PRESETS.filter(p => p.category === category);
}

export function getCategories(): SynthPreset['category'][] {
    return ['Lead', 'Pad', 'Bass', 'Keys', 'Bell', 'Arp', 'FX', 'Texture'];
}

export function findPreset(name: string): SynthPreset | undefined {
    return SYNTH_PRESETS.find(p => p.name === name);
}

export function updatePreset(name: string, updated: Partial<SynthPreset>): boolean {
    const idx = SYNTH_PRESETS.findIndex(p => p.name === name);
    if (idx === -1) return false;
    SYNTH_PRESETS[idx] = { ...SYNTH_PRESETS[idx], ...updated, name: SYNTH_PRESETS[idx].name } as SynthPreset;
    return true;
}

export function addPreset(newPreset: SynthPreset): boolean {
    if (SYNTH_PRESETS.find(p => p.name === newPreset.name)) return false;
    SYNTH_PRESETS.push(newPreset);
    return true;
}

export function loadCustomPresets() {
    try {
        if (typeof window === 'undefined') return;
        const custom = localStorage.getItem('drey-custom-presets');
        if (!custom) return;
        const list = JSON.parse(custom) as SynthPreset[];
        if (!Array.isArray(list)) return;
        list.forEach(p => {
            const idx = SYNTH_PRESETS.findIndex(x => x.name === p.name);
            if (idx === -1) SYNTH_PRESETS.push(p);
            else SYNTH_PRESETS[idx] = { ...SYNTH_PRESETS[idx], ...p } as SynthPreset;
        });
    } catch (e) {
        logger.warn('Failed to load custom presets', e);
    }
}
