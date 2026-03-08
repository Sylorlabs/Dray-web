// Mock scheduler before importing store
jest.mock('../src/lib/scheduler', () => ({
  audioScheduler: {
    start: jest.fn(),
    stop: jest.fn(),
    setTime: jest.fn(),
    getInstance: jest.fn(),
  },
  AudioScheduler: {
    getInstance: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      setTime: jest.fn(),
    })),
  },
}));

// Mock audioEngine
jest.mock('../src/lib/audioEngine', () => ({
  audioEngine: {
    onStateChange: jest.fn(),
    removeStateListener: jest.fn(),
    initialize: jest.fn(),
    getState: jest.fn(() => 'running'),
  },
}));

// Mock Dexie db
jest.mock('../src/lib/db', () => ({
  db: {
    projects: {
      get: jest.fn().mockResolvedValue({ id: 1, name: 'Test', createdAt: 0, updatedAt: 0, tempo: 120, timeSignature: '4/4' }),
      add: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(1),
    },
    tracks: {
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      }),
    },
  },
}));

import { useProjectStore } from '../src/store/useProjectStore';
import { audioScheduler } from '../src/lib/scheduler';

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    useProjectStore.setState({
      activeProject: null,
      tracks: [],
      _past: [],
      _future: [],
      lastAction: null,
      isPlaying: false,
      currentTime: 0,
    });
    jest.clearAllMocks();
  });

  test('initial state has expected defaults', () => {
    const state = useProjectStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.tracks).toEqual([]);
    expect(state.activeProject).toBeNull();
  });

  test('setTracks updates tracks', () => {
    const tracks = [{
      id: 1, name: 'Track 1', type: 'midi' as const, instrument: 'Piano',
      volume: 0.8, pan: 0, muted: false, soloed: false, meterL: 0, meterR: 0,
      clips: [], color: '#fff',
    }];
    useProjectStore.getState().setTracks(tracks);
    expect(useProjectStore.getState().tracks).toEqual(tracks);
  });

  test('setIsPlaying toggles playback state', () => {
    useProjectStore.getState().setIsPlaying(true);
    expect(useProjectStore.getState().isPlaying).toBe(true);
    useProjectStore.getState().setIsPlaying(false);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  test('togglePlay starts scheduler and sets isPlaying', async () => {
    await useProjectStore.getState().togglePlay();
    expect(useProjectStore.getState().isPlaying).toBe(true);
    expect(audioScheduler.start).toHaveBeenCalled();
  });

  test('togglePlay stops scheduler on second call', async () => {
    await useProjectStore.getState().togglePlay(); // play
    await useProjectStore.getState().togglePlay(); // stop
    expect(useProjectStore.getState().isPlaying).toBe(false);
    expect(audioScheduler.stop).toHaveBeenCalled();
  });

  test('setCurrentTime calls audioScheduler.setTime', () => {
    useProjectStore.getState().setCurrentTime(4.5);
    expect(audioScheduler.setTime).toHaveBeenCalledWith(4.5);
  });

  test('setCurrentTime updates currentTime for significant changes', () => {
    useProjectStore.getState().setCurrentTime(10);
    expect(useProjectStore.getState().currentTime).toBe(10);
  });

  test('setCurrentTime skips update for tiny changes', () => {
    useProjectStore.getState().setCurrentTime(5.0);
    // Now set to a value within tolerance (0.001)
    useProjectStore.getState().setCurrentTime(5.0005);
    expect(useProjectStore.getState().currentTime).toBe(5.0);
  });

  test('updateTrack modifies a specific track', () => {
    const tracks = [
      { id: 1, name: 'Track 1', type: 'midi' as const, volume: 0.5, pan: 0, muted: false, soloed: false, meterL: 0, meterR: 0, clips: [], color: '#fff' },
      { id: 2, name: 'Track 2', type: 'midi' as const, volume: 0.8, pan: 0, muted: false, soloed: false, meterL: 0, meterR: 0, clips: [], color: '#f00' },
    ];
    useProjectStore.getState().setTracks(tracks);
    useProjectStore.getState().updateTrack(1, { volume: 0.9, muted: true });
    const updated = useProjectStore.getState().tracks;
    expect(updated[0].volume).toBe(0.9);
    expect(updated[0].muted).toBe(true);
    expect(updated[1].volume).toBe(0.8); // unchanged
  });

  test('setActiveProject sets the project', () => {
    const project = { id: 1, name: 'Test', createdAt: 0, updatedAt: 0, tempo: 120, timeSignature: '4/4' };
    useProjectStore.getState().setActiveProject(project);
    expect(useProjectStore.getState().activeProject).toEqual(project);
  });

  test('setActiveProject can clear project with null', () => {
    useProjectStore.getState().setActiveProject({ id: 1, name: 'X', createdAt: 0, updatedAt: 0, tempo: 120, timeSignature: '4/4' });
    useProjectStore.getState().setActiveProject(null);
    expect(useProjectStore.getState().activeProject).toBeNull();
  });

  describe('undo/redo', () => {
    const makeTrack = (id: number, name: string, overrides: Partial<import('../src/lib/types').Track> = {}): import('../src/lib/types').Track => ({
      id, name, type: 'midi', color: '#fff', volume: 1, pan: 0,
      muted: false, soloed: false, meterL: 0, meterR: 0, instrument: 'Piano', clips: [],
      ...overrides,
    });

    test('undo reverts the last setTracks change', () => {
      const store = useProjectStore.getState();
      const original = store.tracks;
      store.setTracks([...original, makeTrack(99, 'Test')], 'Add track');
      expect(useProjectStore.getState().tracks).toHaveLength(original.length + 1);

      store.undo();
      expect(useProjectStore.getState().tracks).toHaveLength(original.length);
      expect(useProjectStore.getState().tracks).toEqual(original);
    });

    test('redo restores after undo', () => {
      const store = useProjectStore.getState();
      const original = store.tracks;
      store.setTracks([], 'Clear');
      store.undo();
      expect(useProjectStore.getState().tracks).toEqual(original);

      store.redo();
      expect(useProjectStore.getState().tracks).toEqual([]);
    });

    test('non-historical changes preserve redo stack', () => {
      const store = useProjectStore.getState();
      store.setTracks([], 'Clear');
      store.undo(); // Can redo

      // Non-historical change (e.g., volume adjustment)
      const current = useProjectStore.getState().tracks;
      store.setTracks(current.map(t => ({ ...t, volume: 0.5 })), 'Volume', { recordHistory: false });

      // Redo should still work
      expect(useProjectStore.getState()._future.length).toBeGreaterThan(0);
    });

    test('undo on empty history is a no-op', () => {
      useProjectStore.setState({ _past: [], _future: [] });
      const before = useProjectStore.getState().tracks;
      useProjectStore.getState().undo();
      expect(useProjectStore.getState().tracks).toEqual(before);
    });

    test('history is bounded by MAX_HISTORY', () => {
      const store = useProjectStore.getState();
      for (let i = 0; i < 60; i++) {
        store.setTracks([makeTrack(i, `T${i}`)], `Action ${i}`);
      }
      expect(useProjectStore.getState()._past.length).toBeLessThanOrEqual(50);
    });
  });

  test('loadProject fetches from db and sets state', async () => {
    await useProjectStore.getState().loadProject(1);
    const state = useProjectStore.getState();
    expect(state.activeProject).toBeTruthy();
    expect(state.activeProject!.name).toBe('Test');
  });

  test('createProject adds to db and sets state', async () => {
    await useProjectStore.getState().createProject('New Song');
    const state = useProjectStore.getState();
    expect(state.activeProject).toBeTruthy();
    expect(state.tracks).toEqual([]); // tracks unchanged from beforeEach reset
  });

  test('setTracks works with functional updater', () => {
    const store = useProjectStore.getState();
    const original = store.tracks;
    store.setTracks(prev => [...prev, {
      id: 100, name: 'Func Test', type: 'midi', color: '#fff',
      volume: 1, pan: 0, muted: false, soloed: false,
      meterL: 0, meterR: 0, instrument: 'Piano', clips: []
    }], 'Functional add');
    expect(useProjectStore.getState().tracks).toHaveLength(original.length + 1);
    expect(useProjectStore.getState().tracks[useProjectStore.getState().tracks.length - 1].name).toBe('Func Test');
  });
});
