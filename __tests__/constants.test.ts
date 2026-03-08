import {
  getEngineForInstrument,
  BASS_PRESETS,
  KEYS_PRESETS,
  FX_PRESETS,
  VOCAL_PRESETS,
  DRUM_MAP,
  NOTE_NAMES,
  GRID_OPTIONS,
  TRACK_COLORS,
  DEFAULT_TEMPO,
  TOTAL_NOTES,
  OCTAVE_COUNT,
} from '../src/lib/constants';

describe('getEngineForInstrument', () => {
  test('returns "bass" for all bass presets', () => {
    for (const preset of BASS_PRESETS) {
      expect(getEngineForInstrument(preset)).toBe('bass');
    }
  });

  test('returns "keys" for all keys presets', () => {
    for (const preset of KEYS_PRESETS) {
      expect(getEngineForInstrument(preset)).toBe('keys');
    }
  });

  test('returns "vocal" for all vocal presets', () => {
    for (const preset of VOCAL_PRESETS) {
      expect(getEngineForInstrument(preset)).toBe('vocal');
    }
  });

  test('returns "fx" for all fx presets', () => {
    for (const preset of FX_PRESETS) {
      expect(getEngineForInstrument(preset)).toBe('fx');
    }
  });

  test('returns "synth" for unknown instruments', () => {
    expect(getEngineForInstrument('Unknown Instrument')).toBe('synth');
    expect(getEngineForInstrument('')).toBe('synth');
  });

  test('is case-insensitive via exact match', () => {
    const firstBass = BASS_PRESETS[0];
    expect(getEngineForInstrument(firstBass.toUpperCase())).toBe('bass');
    expect(getEngineForInstrument(firstBass.toLowerCase())).toBe('bass');
  });

  test('falls back to substring match for partial names', () => {
    // "Sub Bass" is a bass preset; "Deep Sub Bass" should match via substring
    expect(getEngineForInstrument('Deep Sub Bass')).toBe('bass');
  });
});

describe('preset arrays', () => {
  test('all preset arrays are non-empty', () => {
    expect(BASS_PRESETS.length).toBeGreaterThan(0);
    expect(KEYS_PRESETS.length).toBeGreaterThan(0);
    expect(VOCAL_PRESETS.length).toBeGreaterThan(0);
    expect(FX_PRESETS.length).toBeGreaterThan(0);
  });

  test('no duplicate preset names within a category', () => {
    const checkDups = (arr: string[], label: string) => {
      const lower = arr.map(p => p.toLowerCase());
      const unique = new Set(lower);
      expect(unique.size).toBe(lower.length);
    };
    checkDups(BASS_PRESETS, 'bass');
    checkDups(KEYS_PRESETS, 'keys');
    checkDups(VOCAL_PRESETS, 'vocal');
    checkDups(FX_PRESETS, 'fx');
  });
});

describe('constant values', () => {
  test('DRUM_MAP maps MIDI numbers to drum names', () => {
    expect(DRUM_MAP[36]).toBe('Kick Drum');
    expect(DRUM_MAP[38]).toBe('Snare Drum');
    expect(DRUM_MAP[42]).toBe('Closed Hi-Hat');
  });

  test('NOTE_NAMES has 12 semitones', () => {
    expect(NOTE_NAMES).toHaveLength(12);
    expect(NOTE_NAMES[0]).toBe('C');
  });

  test('GRID_OPTIONS are ordered from whole to smallest subdivision', () => {
    for (let i = 1; i < GRID_OPTIONS.length; i++) {
      expect(GRID_OPTIONS[i].value).toBeLessThan(GRID_OPTIONS[i - 1].value);
    }
  });

  test('TRACK_COLORS are valid hex colors', () => {
    for (const color of TRACK_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('DEFAULT_TEMPO is 120', () => {
    expect(DEFAULT_TEMPO).toBe(120);
  });

  test('TOTAL_NOTES equals OCTAVE_COUNT * 12', () => {
    expect(TOTAL_NOTES).toBe(OCTAVE_COUNT * 12);
  });
});
