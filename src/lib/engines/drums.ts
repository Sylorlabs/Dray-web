import { ensureTone } from '../toneWrapper';
import type { ToneLibType } from '../toneWrapper';
import { audioEngine } from '../audioEngine';

/**
 * Kit-specific sound parameters
 */
interface KitParams {
    kick: {
        pitchDecay: number;
        octaves: number;
        frequency: string;
        decay: number;
        distortion: number;
    };
    snare: {
        frequency: string;
        decay: number;
        noiseType: 'white' | 'pink' | 'brown';
        noiseDecay: number;
        toneRatio: number;
    };
    hihat: {
        frequency: number;
        harmonicity: number;
        decay: number;
        resonance: number;
    };
    clap: {
        noiseType: 'white' | 'pink';
        filterFreq: number;
        decay: number;
        count: number;
    };
    tom: {
        pitchDecay: number;
        octaves: number;
        baseFreq: number;
    };
}

// ... COPYING EXISTING DRUM_KITS ...
const DRUM_KITS: Record<string, KitParams> = {
    '808': {
        kick: { pitchDecay: 0.08, octaves: 4, frequency: 'C1', decay: 0.8, distortion: 0.1 },
        snare: { frequency: 'D2', decay: 0.2, noiseType: 'white', noiseDecay: 0.15, toneRatio: 0.6 },
        hihat: { frequency: 8000, harmonicity: 5.1, decay: 0.08, resonance: 4000 },
        clap: { noiseType: 'white', filterFreq: 1500, decay: 0.15, count: 3 },
        tom: { pitchDecay: 0.05, octaves: 3, baseFreq: 100 }
    },
    '909': {
        kick: { pitchDecay: 0.05, octaves: 6, frequency: 'D1', decay: 0.5, distortion: 0.2 },
        snare: { frequency: 'E2', decay: 0.15, noiseType: 'white', noiseDecay: 0.2, toneRatio: 0.5 },
        hihat: { frequency: 10000, harmonicity: 6, decay: 0.05, resonance: 5000 },
        clap: { noiseType: 'white', filterFreq: 2000, decay: 0.12, count: 4 },
        tom: { pitchDecay: 0.04, octaves: 4, baseFreq: 120 }
    },
    'Trap': {
        kick: { pitchDecay: 0.12, octaves: 5, frequency: 'B0', decay: 1.0, distortion: 0.25 },
        snare: { frequency: 'C#2', decay: 0.25, noiseType: 'white', noiseDecay: 0.18, toneRatio: 0.4 },
        hihat: { frequency: 12000, harmonicity: 7, decay: 0.03, resonance: 6000 },
        clap: { noiseType: 'white', filterFreq: 2500, decay: 0.2, count: 2 },
        tom: { pitchDecay: 0.08, octaves: 4, baseFreq: 80 }
    },
    'Acoustic': {
        kick: { pitchDecay: 0.03, octaves: 2, frequency: 'E1', decay: 0.4, distortion: 0.02 },
        snare: { frequency: 'G2', decay: 0.3, noiseType: 'pink', noiseDecay: 0.25, toneRatio: 0.3 },
        hihat: { frequency: 6000, harmonicity: 4, decay: 0.12, resonance: 3000 },
        clap: { noiseType: 'pink', filterFreq: 1200, decay: 0.25, count: 5 },
        tom: { pitchDecay: 0.02, octaves: 2, baseFreq: 150 }
    },
    'Lo-Fi': {
        kick: { pitchDecay: 0.1, octaves: 3, frequency: 'C#1', decay: 0.6, distortion: 0.15 },
        snare: { frequency: 'D#2', decay: 0.22, noiseType: 'brown', noiseDecay: 0.2, toneRatio: 0.5 },
        hihat: { frequency: 5000, harmonicity: 3.5, decay: 0.1, resonance: 2000 },
        clap: { noiseType: 'pink', filterFreq: 1000, decay: 0.18, count: 3 },
        tom: { pitchDecay: 0.06, octaves: 2.5, baseFreq: 110 }
    },
    'Phonk': {
        kick: { pitchDecay: 0.15, octaves: 5, frequency: 'A0', decay: 0.9, distortion: 0.35 },
        snare: { frequency: 'C2', decay: 0.2, noiseType: 'white', noiseDecay: 0.15, toneRatio: 0.55 },
        hihat: { frequency: 9000, harmonicity: 5.5, decay: 0.06, resonance: 4500 },
        clap: { noiseType: 'white', filterFreq: 1800, decay: 0.14, count: 4 },
        tom: { pitchDecay: 0.1, octaves: 4, baseFreq: 90 }
    },
    'Boom Bap': {
        kick: { pitchDecay: 0.06, octaves: 3.5, frequency: 'D1', decay: 0.55, distortion: 0.12 },
        snare: { frequency: 'F2', decay: 0.28, noiseType: 'pink', noiseDecay: 0.22, toneRatio: 0.45 },
        hihat: { frequency: 7000, harmonicity: 4.5, decay: 0.09, resonance: 3500 },
        clap: { noiseType: 'pink', filterFreq: 1400, decay: 0.2, count: 3 },
        tom: { pitchDecay: 0.04, octaves: 2.8, baseFreq: 130 }
    },
    'EDM': {
        kick: { pitchDecay: 0.04, octaves: 5.5, frequency: 'C#1', decay: 0.45, distortion: 0.18 },
        snare: { frequency: 'F#2', decay: 0.18, noiseType: 'white', noiseDecay: 0.16, toneRatio: 0.5 },
        hihat: { frequency: 11000, harmonicity: 6.5, decay: 0.04, resonance: 5500 },
        clap: { noiseType: 'white', filterFreq: 2200, decay: 0.13, count: 4 },
        tom: { pitchDecay: 0.035, octaves: 4.5, baseFreq: 115 }
    }
};

/**
 * Each MIDI drum pitch gets its own unique synthesized voice.
 * No two pitches share the same synthesis.
 *
 * Pitch → voice descriptor used in triggerDrumVoice()
 */
const PITCH_VOICE_MAP: Record<number, string> = {
    36: 'kick-main',       // Kick Drum
    37: 'rimshot',         // Side Stick / Rimshot
    38: 'snare-main',      // Snare Drum
    39: 'clap',            // Hand Clap
    40: 'snare-electric',  // Snare 2 (electric snare)
    41: 'tom-floor-low',   // Floor Tom L
    42: 'hihat-closed',    // Closed Hi-Hat
    43: 'tom-floor-high',  // Floor Tom H
    44: 'hihat-pedal',     // Pedal Hi-Hat
    45: 'tom-low',         // Low Tom
    46: 'hihat-open',      // Open Hi-Hat
    47: 'tom-mid',         // Mid Tom
    48: 'tom-high',        // High Tom
    49: 'crash',           // Crash Cymbal
    50: 'tom-high2',       // High Tom 2
    51: 'ride',            // Ride Cymbal
    52: 'china',           // China Cymbal
    53: 'ride-bell',       // Ride Bell
    54: 'tambourine',      // Tambourine
    56: 'cowbell',         // Cowbell
};

/**
 * Per-track drum voice bundle - one synth instance per unique voice
 */
interface DrumVoiceBundle {
    [voice: string]: any; // each voice key → synth node (or array of nodes)
}

class ToneDrumMachine {
    private ToneLib: ToneLibType | null = null;
    private initialized = false;
    private initializationPromise: Promise<void> | null = null;

    // Key: `${trackId}-${kitName}`
    private voiceBundles = new Map<string, DrumVoiceBundle>();
    private currentKit: string = '808';

    async initialize() {
        if (this.initialized) return;
        if (this.initializationPromise) return this.initializationPromise;
        this.initializationPromise = (async () => {
            await audioEngine.initialize();
            this.ToneLib = await ensureTone() as ToneLibType;
            this.initialized = true;
        })();
        return this.initializationPromise;
    }

    setKit(kit: string) {
        const normalized = kit.replace(/ Kit$/i, '')
            .replace(/^Acoustic Kit$/i, 'Acoustic').replace(/^Jazz Brushes$/i, 'Acoustic')
            .replace(/^Rock Kit$/i, 'Acoustic').replace(/^Lo-Fi Kit$/i, 'Lo-Fi')
            .replace(/^Vinyl Drums$/i, 'Lo-Fi').replace(/^Phonk Kit$/i, 'Phonk')
            .replace(/^EDM Kit$/i, 'EDM');
        this.currentKit = DRUM_KITS[normalized] ? normalized : (DRUM_KITS[kit] ? kit : '808');
    }

    getAvailableKits(): string[] {
        return Object.keys(DRUM_KITS);
    }

    /**
     * Build one synth node per unique drum voice for a given track+kit combo.
     * Each voice has completely distinct synthesis - no shared synths.
     */
    private async getVoiceBundle(trackId: number, kit: string): Promise<DrumVoiceBundle> {
        const key = `${trackId}-${kit}`;
        if (this.voiceBundles.has(key)) return this.voiceBundles.get(key)!;

        if (!this.initialized) await this.initialize();
        const T = this.ToneLib!;
        const dest = audioEngine.getTrackChannel(trackId).input;
        const p = DRUM_KITS[kit] || DRUM_KITS['808'];

        const bundle: DrumVoiceBundle = {};

        // ── 36: KICK (main) ── deep sine membrane with pitch drop
        {
            const dist = new T.Distortion(p.kick.distortion);
            const comp = new T.Compressor({ threshold: -18, ratio: 4 });
            const s = new T.MembraneSynth({
                pitchDecay: p.kick.pitchDecay,
                octaves: p.kick.octaves,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: p.kick.decay, sustain: 0, release: p.kick.decay }
            });
            s.chain(dist, comp, dest);
            bundle['kick-main'] = { s, dist, comp };
        }

        // ── 37: RIMSHOT ── high-pitched membrane tap, mostly tone, short
        {
            const filt = new T.Filter({ frequency: 5000, type: 'highpass' });
            const gain = new T.Gain(0.7).connect(dest);
            const s = new T.MembraneSynth({
                pitchDecay: 0.01,
                octaves: 1.5,
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 }
            });
            s.connect(filt);
            filt.connect(gain);
            bundle['rimshot'] = { s, filt, gain };
        }

        // ── 38: SNARE (main) ── membrane body + white noise
        {
            const body = new T.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 2,
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.001, decay: p.snare.decay, sustain: 0, release: p.snare.decay }
            });
            const noise = new T.NoiseSynth({
                noise: { type: p.snare.noiseType },
                envelope: { attack: 0.001, decay: p.snare.noiseDecay, sustain: 0, release: 0.05 }
            });
            const filt = new T.Filter({ type: 'highpass', frequency: 2000 });
            const comp = new T.Compressor({ threshold: -15, ratio: 4 });
            const bodyGain = new T.Gain(p.snare.toneRatio);
            const noiseGain = new T.Gain(1 - p.snare.toneRatio);
            body.connect(bodyGain); bodyGain.connect(comp);
            noise.connect(filt); filt.connect(noiseGain); noiseGain.connect(comp);
            comp.connect(dest);
            bundle['snare-main'] = { body, noise, filt, comp, bodyGain, noiseGain };
        }

        // ── 39: CLAP ── burst of bandpass-filtered white noise, layered
        {
            const noise = new T.NoiseSynth({
                noise: { type: p.clap.noiseType },
                envelope: { attack: 0.001, decay: p.clap.decay, sustain: 0, release: 0.05 }
            });
            const filt = new T.Filter({ type: 'bandpass', frequency: p.clap.filterFreq, Q: 2 });
            const gain = new T.Gain(1.2).connect(dest);
            noise.connect(filt); filt.connect(gain);
            bundle['clap'] = { noise, filt, gain };
        }

        // ── 40: ELECTRIC SNARE ── brighter, more noise-heavy, shorter body
        {
            const body = new T.MembraneSynth({
                pitchDecay: 0.02,
                octaves: 1.5,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }
            });
            const noise = new T.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 }
            });
            const filt = new T.Filter({ type: 'highpass', frequency: 3500 });
            const comp = new T.Compressor({ threshold: -12, ratio: 5 });
            const bGain = new T.Gain(0.3);
            const nGain = new T.Gain(0.7);
            body.connect(bGain); bGain.connect(comp);
            noise.connect(filt); filt.connect(nGain); nGain.connect(comp);
            comp.connect(dest);
            bundle['snare-electric'] = { body, noise, filt, comp, bGain, nGain };
        }

        // ── 41: FLOOR TOM LOW ── deep tom, low pitch, long decay
        {
            const s = new T.MembraneSynth({
                pitchDecay: p.tom.pitchDecay * 1.5,
                octaves: p.tom.octaves,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.3 }
            });
            s.connect(dest);
            bundle['tom-floor-low'] = { s };
        }

        // ── 42: CLOSED HI-HAT ── short metallic burst
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: p.hihat.decay, release: 0.01 },
                harmonicity: p.hihat.harmonicity,
                modulationIndex: 32,
                resonance: p.hihat.resonance,
                octaves: 1.5
            });
            s.frequency.value = p.hihat.frequency;
            s.volume.value = -8;
            s.connect(dest);
            bundle['hihat-closed'] = { s };
        }

        // ── 43: FLOOR TOM HIGH ── mid-low tom, slightly higher than floor low
        {
            const s = new T.MembraneSynth({
                pitchDecay: p.tom.pitchDecay * 1.2,
                octaves: p.tom.octaves * 0.9,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.25 }
            });
            s.connect(dest);
            bundle['tom-floor-high'] = { s };
        }

        // ── 44: PEDAL HI-HAT ── tighter than closed hat, even shorter
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: p.hihat.decay * 0.5, release: 0.005 },
                harmonicity: p.hihat.harmonicity * 0.9,
                modulationIndex: 28,
                resonance: p.hihat.resonance * 1.1,
                octaves: 1.2
            });
            s.frequency.value = p.hihat.frequency * 0.95;
            s.volume.value = -10;
            s.connect(dest);
            bundle['hihat-pedal'] = { s };
        }

        // ── 45: LOW TOM ── classic low tom
        {
            const s = new T.MembraneSynth({
                pitchDecay: p.tom.pitchDecay,
                octaves: p.tom.octaves,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 }
            });
            s.connect(dest);
            bundle['tom-low'] = { s };
        }

        // ── 46: OPEN HI-HAT ── long metallic sustain
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 0.4, release: 0.3 },
                harmonicity: p.hihat.harmonicity,
                modulationIndex: 32,
                resonance: p.hihat.resonance,
                octaves: 1.5
            });
            s.frequency.value = p.hihat.frequency;
            s.volume.value = -6;
            s.connect(dest);
            bundle['hihat-open'] = { s };
        }

        // ── 47: MID TOM
        {
            const s = new T.MembraneSynth({
                pitchDecay: p.tom.pitchDecay * 0.8,
                octaves: p.tom.octaves * 0.8,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.18 }
            });
            s.connect(dest);
            bundle['tom-mid'] = { s };
        }

        // ── 48: HIGH TOM
        {
            const s = new T.MembraneSynth({
                pitchDecay: p.tom.pitchDecay * 0.6,
                octaves: p.tom.octaves * 0.6,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 }
            });
            s.connect(dest);
            bundle['tom-high'] = { s };
        }

        // ── 49: CRASH CYMBAL ── long bright metallic wash
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 2.5, release: 0.5 },
                harmonicity: 5.6,
                modulationIndex: 40,
                resonance: 3800,
                octaves: 1.5
            });
            s.frequency.value = 220;
            s.volume.value = -4;
            s.connect(dest);
            bundle['crash'] = { s };
        }

        // ── 50: HIGH TOM 2 ── highest tom, very short pitch drop
        {
            const s = new T.MembraneSynth({
                pitchDecay: p.tom.pitchDecay * 0.4,
                octaves: p.tom.octaves * 0.5,
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 }
            });
            s.connect(dest);
            bundle['tom-high2'] = { s };
        }

        // ── 51: RIDE CYMBAL ── moderate sustain, darker than crash
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 1.0, release: 0.2 },
                harmonicity: 4.8,
                modulationIndex: 25,
                resonance: 3200,
                octaves: 1.2
            });
            s.frequency.value = 180;
            s.volume.value = -5;
            s.connect(dest);
            bundle['ride'] = { s };
        }

        // ── 52: CHINA CYMBAL ── trashier, more dissonant than crash
        {
            const dist = new T.Distortion(0.15);
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 1.8, release: 0.4 },
                harmonicity: 7.2,
                modulationIndex: 50,
                resonance: 4500,
                octaves: 2.0
            });
            s.frequency.value = 300;
            s.volume.value = -4;
            s.connect(dist);
            dist.connect(dest);
            bundle['china'] = { s, dist };
        }

        // ── 53: RIDE BELL ── bright, short, pitched metallic ping
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 0.35, release: 0.1 },
                harmonicity: 8,
                modulationIndex: 15,
                resonance: 6000,
                octaves: 0.8
            });
            s.frequency.value = 600;
            s.volume.value = -6;
            s.connect(dest);
            bundle['ride-bell'] = { s };
        }

        // ── 54: TAMBOURINE ── very short, high-frequency jingle
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 0.06, release: 0.04 },
                harmonicity: 12,
                modulationIndex: 20,
                resonance: 8000,
                octaves: 0.5
            });
            s.frequency.value = 3000;
            s.volume.value = -8;
            s.connect(dest);
            bundle['tambourine'] = { s };
        }

        // ── 56: COWBELL ── iconic pitched metallic tone
        {
            const s = new T.MetalSynth({
                envelope: { attack: 0.001, decay: 0.15, release: 0.1 },
                harmonicity: 12,
                modulationIndex: 20,
                resonance: 3000,
                octaves: 0.5
            });
            s.frequency.value = 800;
            s.volume.value = -5;
            s.connect(dest);
            bundle['cowbell'] = { s };
        }

        this.voiceBundles.set(key, bundle);
        return bundle;
    }

    /**
     * Trigger a single drum hit - each MIDI pitch has its own unique synthesis.
     */
    async playNote(trackId: number, pitch: number, velocity: number = 0.9, time?: number) {
        if (!this.initialized) await this.initialize();

        const voice = PITCH_VOICE_MAP[pitch];
        if (!voice) return;

        const kit = this.currentKit;
        const bundle = await this.getVoiceBundle(trackId, kit);
        const ToneLib = this.ToneLib!;
        const now = ToneLib.now();
        const t = Math.max((time ?? now), now + 0.005);
        const p = DRUM_KITS[kit] || DRUM_KITS['808'];
        const v = bundle[voice];
        if (!v) return;

        const safe = (fn: () => void) => {
            try { fn(); } catch (e: any) {
                if (!e?.message?.includes('Start time')) console.error('Drum voice error:', voice, e);
            }
        };

        switch (voice) {
            case 'kick-main':
                safe(() => v.s.triggerAttackRelease(p.kick.frequency, '8n', t, velocity));
                break;

            case 'rimshot':
                safe(() => v.s.triggerAttackRelease('A3', '64n', t, velocity));
                break;

            case 'snare-main':
                safe(() => {
                    v.body.triggerAttackRelease(p.snare.frequency, '16n', t, velocity);
                    v.noise.triggerAttackRelease('16n', t, velocity);
                });
                break;

            case 'clap':
                safe(() => {
                    v.noise.triggerAttackRelease('16n', t, velocity);
                    if (p.clap.count > 1) {
                        for (let i = 1; i < p.clap.count; i++) {
                            try { v.noise.triggerAttackRelease('32n', t + i * 0.01, velocity * 0.65); } catch { /* overlap ok */ }
                        }
                    }
                });
                break;

            case 'snare-electric':
                safe(() => {
                    v.body.triggerAttackRelease('E3', '32n', t, velocity);
                    v.noise.triggerAttackRelease('16n', t, velocity);
                });
                break;

            case 'tom-floor-low':
                safe(() => v.s.triggerAttackRelease(p.tom.baseFreq * 0.7, '8n', t, velocity));
                break;

            case 'hihat-closed':
                safe(() => v.s.triggerAttackRelease('32n', t, velocity));
                break;

            case 'tom-floor-high':
                safe(() => v.s.triggerAttackRelease(p.tom.baseFreq * 0.85, '8n', t, velocity));
                break;

            case 'hihat-pedal':
                safe(() => v.s.triggerAttackRelease('64n', t, velocity));
                break;

            case 'tom-low':
                safe(() => v.s.triggerAttackRelease(p.tom.baseFreq, '8n', t, velocity));
                break;

            case 'hihat-open':
                safe(() => v.s.triggerAttackRelease('8n', t, velocity));
                break;

            case 'tom-mid':
                safe(() => v.s.triggerAttackRelease(p.tom.baseFreq * 1.5, '8n', t, velocity));
                break;

            case 'tom-high':
                safe(() => v.s.triggerAttackRelease(p.tom.baseFreq * 2, '8n', t, velocity));
                break;

            case 'crash':
                safe(() => v.s.triggerAttackRelease('8n', t, velocity));
                break;

            case 'tom-high2':
                safe(() => v.s.triggerAttackRelease(p.tom.baseFreq * 2.6, '8n', t, velocity));
                break;

            case 'ride':
                safe(() => v.s.triggerAttackRelease('16n', t, velocity));
                break;

            case 'china':
                safe(() => v.s.triggerAttackRelease('8n', t, velocity));
                break;

            case 'ride-bell':
                safe(() => v.s.triggerAttackRelease('16n', t, velocity));
                break;

            case 'tambourine':
                safe(() => v.s.triggerAttackRelease('32n', t, velocity));
                break;

            case 'cowbell':
                safe(() => v.s.triggerAttackRelease('16n', t, velocity));
                break;
        }
    }

    async previewNote(trackId: number, pitch: number, velocity: number = 0.8) {
        await this.playNote(trackId, pitch, velocity);
    }

    // Legacy helpers kept for compatibility
    async playKick(trackId: number, kit: string, velocity: number = 0.9, time?: number) {
        this.setKit(kit);
        await this.playNote(trackId, 36, velocity, time);
    }

    stopAll() { /* envelopes handle this */ }

    dispose() {
        this.voiceBundles.forEach(bundle => {
            Object.values(bundle).forEach((v: any) => {
                if (!v) return;
                if (v.s) try { v.s.dispose(); } catch { /* */ }
                if (v.dist) try { v.dist.dispose(); } catch { /* */ }
                if (v.filt) try { v.filt.dispose(); } catch { /* */ }
                if (v.comp) try { v.comp.dispose(); } catch { /* */ }
                if (v.gain) try { v.gain.dispose(); } catch { /* */ }
                if (v.body) try { v.body.dispose(); } catch { /* */ }
                if (v.noise) try { v.noise.dispose(); } catch { /* */ }
                if (v.bodyGain) try { v.bodyGain.dispose(); } catch { /* */ }
                if (v.noiseGain) try { v.noiseGain.dispose(); } catch { /* */ }
                if (v.bGain) try { v.bGain.dispose(); } catch { /* */ }
                if (v.nGain) try { v.nGain.dispose(); } catch { /* */ }
            });
        });
        this.voiceBundles.clear();
    }
}

export const toneDrumMachine = new ToneDrumMachine();
