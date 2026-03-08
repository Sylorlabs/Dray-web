import { AudioScheduler } from '../src/lib/scheduler';

// Mock audioEngine.registerSchedulerWorklet to provide a fake worklet node with a port
jest.mock('../src/lib/audioEngine', () => ({
  audioEngine: {
    initialize: jest.fn(() => Promise.resolve()),
    getState: jest.fn(() => 'running'),
    resume: jest.fn(() => Promise.resolve()),
    getNow: jest.fn(() => 0),
    onStateChange: jest.fn(),
    getContext: jest.fn(() => ({ currentTime: 0, decodeAudioData: async (buf: any) => ({}) })),
    registerSchedulerWorklet: jest.fn(() => {
      const port: any = {
        start: jest.fn(),
        postMessage: jest.fn((msg: any) => { /* no-op */ }),
        onmessage: null as any,
      };
      // Simulate sending ticks to scheduler via invoking onmessage
      setTimeout(() => {
        if (typeof port.onmessage === 'function') port.onmessage({ data: { type: 'tick', tickIndex: 0, engineTime: 0 } });
      }, 0);
      return Promise.resolve({ port } as any);
    })
  }
}));

jest.mock('../src/lib/toneEngine', () => ({
  toneSynthEngine: { initialize: jest.fn(() => Promise.resolve()), stopAll: jest.fn() },
  toneDrumMachine: { initialize: jest.fn(() => Promise.resolve()), stopAll: jest.fn(), playNote: jest.fn() },
  toneBassEngine: { initialize: jest.fn(() => Promise.resolve()), stopAll: jest.fn() },
  toneKeysEngine: { initialize: jest.fn(() => Promise.resolve()), stopAll: jest.fn() },
  toneVocalEngine: { initialize: jest.fn(() => Promise.resolve()), stopAll: jest.fn() },
  toneFXEngine: { initialize: jest.fn(() => Promise.resolve()), stopAll: jest.fn() }
}));

describe('Worklet integration', () => {
  it('registers worklet and reacts to tick', async () => {
    const sched = AudioScheduler.getInstance();
    await sched.start();
    expect(sched.isRunning()).toBe(true);
    // Give some time for the mocked tick to arrive
    await new Promise(r => setTimeout(r, 50));
    await sched.stop();
    expect(sched.isRunning()).toBe(false);
  }, 10000);
});
