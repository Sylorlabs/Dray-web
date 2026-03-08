import type { Track, Clip, MidiNote, Project } from '../src/lib/types';
import { SOUND_TYPE_MAP } from '../src/lib/types';

describe('Type definitions', () => {
  test('Track can be constructed with required fields', () => {
    const track: Track = {
      id: 1,
      name: 'Test Track',
      type: 'midi',
      color: '#ff0000',
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      meterL: 0,
      meterR: 0,
      clips: [],
    };
    expect(track.id).toBe(1);
    expect(track.projectId).toBeUndefined();
    expect(track.instrument).toBeUndefined();
  });

  test('Track with optional instrument field', () => {
    const track: Track = {
      id: 2,
      name: 'Piano Track',
      type: 'midi',
      color: '#00ff00',
      volume: 1,
      pan: 50,
      muted: true,
      soloed: false,
      meterL: 0.5,
      meterR: 0.5,
      instrument: 'Grand Piano',
      clips: [],
    };
    expect(track.instrument).toBe('Grand Piano');
    expect(track.muted).toBe(true);
  });

  test('Clip can be constructed with required fields', () => {
    const clip: Clip = {
      start: 0,
      duration: 4,
      name: 'Clip 1',
    };
    expect(clip.start).toBe(0);
    expect(clip.duration).toBe(4);
    expect(clip.id).toBeUndefined();
    expect(clip.notes).toBeUndefined();
  });

  test('Clip with notes and optional fields', () => {
    const note: MidiNote = {
      id: 'n1',
      pitch: 60,
      start: 0,
      duration: 0.5,
      velocity: 0.8,
    };
    const clip: Clip = {
      id: 'clip-1',
      start: 0,
      duration: 4,
      name: 'Test Clip',
      notes: [note],
      gain: 0.9,
      pitch: 0,
      reverse: false,
    };
    expect(clip.notes).toHaveLength(1);
    expect(clip.notes![0].pitch).toBe(60);
  });

  test('MidiNote has required fields', () => {
    const note: MidiNote = {
      id: 'note-1',
      pitch: 72,
      start: 2,
      duration: 1,
      velocity: 0.6,
    };
    expect(note.pitch).toBe(72);
    expect(note.velocity).toBe(0.6);
    expect(note.start).toBe(2);
  });

  test('Project has required fields', () => {
    const project: Project = {
      name: 'My Song',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tempo: 120,
      timeSignature: '4/4',
    };
    expect(project.name).toBe('My Song');
    expect(project.id).toBeUndefined();
    expect(project.loopStart).toBeUndefined();
  });
});

describe('SOUND_TYPE_MAP', () => {
  test('maps Drums to drums track type', () => {
    expect(SOUND_TYPE_MAP.Drums).toBe('drums');
  });

  test('maps melodic categories to midi', () => {
    expect(SOUND_TYPE_MAP.Bass).toBe('midi');
    expect(SOUND_TYPE_MAP.Synths).toBe('midi');
    expect(SOUND_TYPE_MAP.Keys).toBe('midi');
    expect(SOUND_TYPE_MAP.Leads).toBe('midi');
    expect(SOUND_TYPE_MAP.Pads).toBe('midi');
  });

  test('maps FX to audio', () => {
    expect(SOUND_TYPE_MAP.FX).toBe('audio');
  });

  test('maps Vocals to audio', () => {
    expect(SOUND_TYPE_MAP.Vocals).toBe('audio');
  });
});
