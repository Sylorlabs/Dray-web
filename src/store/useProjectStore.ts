import { create } from 'zustand';
import { audioScheduler } from '../lib/scheduler';
import { audioEngine } from '../lib/audioEngine';
import type { Track, Project } from '../lib/types';
import { logger } from '../lib/logger';

// Re-export types for backwards compatibility with db.ts
export type { Track, Project };

const MAX_HISTORY = 50;

// Initial tracks with real MIDI data
const INITIAL_TRACKS: Track[] = [
    {
        id: 1, name: 'Drums', type: 'drums', color: '#eb459e', volume: 0.8, pan: 0, muted: false, soloed: false, meterL: 0, meterR: 0, instrument: '808 Kit',
        clips: [
            {
                start: 0, duration: 4, name: 'Beat 1', notes: [
                    { id: 'd1', pitch: 36, start: 0, duration: 0.25, velocity: 1 },
                    { id: 'd2', pitch: 42, start: 1, duration: 0.25, velocity: 1 },
                    { id: 'd3', pitch: 38, start: 2, duration: 0.25, velocity: 1 },
                    { id: 'd4', pitch: 42, start: 3, duration: 0.25, velocity: 1 },
                ]
            }
        ]
    },
    {
        id: 2, name: 'Bass', type: 'midi', color: '#5865f2', volume: 0.75, pan: 0, muted: false, soloed: false, meterL: 0, meterR: 0, instrument: 'Sub Bass',
        clips: [
            {
                start: 0, duration: 4, name: 'Sub Bass', notes: [
                    { id: 'b1', pitch: 36, start: 0, duration: 1, velocity: 0.8 },
                    { id: 'b2', pitch: 36, start: 1.5, duration: 0.5, velocity: 0.8 },
                    { id: 'b3', pitch: 38, start: 2, duration: 0.5, velocity: 0.8 },
                    { id: 'b4', pitch: 41, start: 3, duration: 1, velocity: 0.8 },
                ]
            }
        ]
    },
    {
        id: 3, name: 'Lead', type: 'midi', color: '#57f287', volume: 0.65, pan: 15, muted: false, soloed: false, meterL: 0, meterR: 0, instrument: 'Super Saw',
        clips: [
            {
                start: 0, duration: 8, name: 'Melody', notes: [
                    { id: 'l1', pitch: 72, start: 0, duration: 0.5, velocity: 0.7 },
                    { id: 'l2', pitch: 74, start: 0.5, duration: 0.5, velocity: 0.7 },
                    { id: 'l3', pitch: 76, start: 1, duration: 1, velocity: 0.7 },
                    { id: 'l4', pitch: 74, start: 2, duration: 0.5, velocity: 0.7 },
                    { id: 'l5', pitch: 72, start: 2.5, duration: 0.5, velocity: 0.7 },
                    { id: 'l6', pitch: 67, start: 3, duration: 1, velocity: 0.7 },
                ]
            }
        ]
    },
    {
        id: 4, name: 'Pad', type: 'midi', color: '#fee75c', volume: 0.5, pan: -10, muted: false, soloed: false, meterL: 0, meterR: 0, instrument: 'Analog Pad',
        clips: [
            {
                start: 0, duration: 8, name: 'Chords', notes: [
                    { id: 'p1', pitch: 60, start: 0, duration: 4, velocity: 0.5 },
                    { id: 'p2', pitch: 64, start: 0, duration: 4, velocity: 0.5 },
                    { id: 'p3', pitch: 67, start: 0, duration: 4, velocity: 0.5 },
                    { id: 'p4', pitch: 58, start: 4, duration: 4, velocity: 0.5 },
                    { id: 'p5', pitch: 62, start: 4, duration: 4, velocity: 0.5 },
                    { id: 'p6', pitch: 65, start: 4, duration: 4, velocity: 0.5 },
                ]
            }
        ]
    }
];

interface ProjectState {
    activeProject: Project | null;
    tracks: Track[];
    _past: Track[][];
    _future: Track[][];
    lastAction: string | null;
    isPlaying: boolean;

    // currentTime is exposed for backwards compatibility but should NOT be used for UI
    // that needs 60fps updates - use usePlaybackTime hook instead
    currentTime: number;

    // Actions
    setActiveProject: (project: Project | null) => void;
    setTracks: (
        newState: Track[] | ((prev: Track[]) => Track[]),
        actionName?: string,
        options?: { recordHistory?: boolean }
    ) => void;
    undo: () => void;
    redo: () => void;
    updateTrack: (trackId: number, updates: Partial<Track>) => void;
    togglePlay: () => Promise<void>;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    updateProject: (updates: Partial<Project>) => Promise<void>;

    // DB Actions
    loadProject: (id: number) => Promise<void>;
    createProject: (name: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    activeProject: null,
    tracks: INITIAL_TRACKS,
    _past: [],
    _future: [],
    lastAction: null,
    isPlaying: false,
    currentTime: 0,

    setActiveProject: (project) => set({ activeProject: project }),

    setTracks: (newState, actionName, options) => {
        const recordHistory = options?.recordHistory ?? true;
        set(state => {
            const resolvedTracks = typeof newState === 'function'
                ? newState(state.tracks)
                : newState;
            if (resolvedTracks === state.tracks) return state;

            if (!recordHistory) {
                return { tracks: resolvedTracks, lastAction: actionName || 'Change' };
            }
            return {
                tracks: resolvedTracks,
                _past: [...state._past, state.tracks].slice(-MAX_HISTORY),
                _future: [],
                lastAction: actionName || 'Change'
            };
        });
    },

    undo: () => set(state => {
        if (state._past.length === 0) return state;
        const newPast = [...state._past];
        const previousTracks = newPast.pop()!;
        return {
            _past: newPast,
            tracks: previousTracks,
            _future: [state.tracks, ...state._future].slice(0, MAX_HISTORY),
            lastAction: 'Undo'
        };
    }),

    redo: () => set(state => {
        if (state._future.length === 0) return state;
        const newFuture = [...state._future];
        const nextTracks = newFuture.shift()!;
        return {
            _past: [...state._past, state.tracks].slice(-MAX_HISTORY),
            tracks: nextTracks,
            _future: newFuture,
            lastAction: 'Redo'
        };
    }),

    updateTrack: (trackId, updates) => set((state) => ({
        tracks: state.tracks.map(t =>
            t.id === trackId ? { ...t, ...updates } : t
        )
    })),

    // Legacy setter - updates are now batched and debounced
    setCurrentTime: (time) => {
        // Update audio scheduler instantly
        // This ensures back button, seeking, and playhead jumps are synced with audio
        audioScheduler.setTime(time);

        // Only update if significant change to reduce unnecessary state updates
        const current = get().currentTime;
        if (Math.abs(time - current) > 0.001) { // Tighter tolerance
            set({ currentTime: time });
        }
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    togglePlay: async () => {
        const { isPlaying } = get();
        if (!isPlaying) {
            try {
                await audioScheduler.start();
                set({ isPlaying: true });
            } catch (e) {
                logger.error('Failed to start playback:', e);
            }
        } else {
            await audioScheduler.stop();
            set({ isPlaying: false, currentTime: 0 });
        }
    },

    loadProject: async (id) => {
        try {
            const { db } = await import('../lib/db');
            const project = await db.projects.get(id);
            if (project) {
                const tracks = await db.tracks.where('projectId').equals(id).toArray();
                set({ activeProject: project, tracks: tracks as Track[] });
            }
        } catch (e) {
            logger.error('Failed to load project:', e);
        }
    },

    createProject: async (name) => {
        try {
            const { db } = await import('../lib/db');
            const id = await db.projects.add({
                name,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tempo: 120,
                timeSignature: '4/4'
            });
            const project = await db.projects.get(id);
            if (project) {
                set({ activeProject: project });
            }
        } catch (e) {
            logger.error('Failed to create project:', e);
        }
    },

    updateProject: async (updates: Partial<Project>) => {
        const { activeProject } = get();
        if (!activeProject) return;

        const updatedProject = { ...activeProject, ...updates, updatedAt: Date.now() };
        set({ activeProject: updatedProject });

        try {
            const { db } = await import('../lib/db');
            await db.projects.update(activeProject.id, updates);
        } catch (e) {
            logger.error('Failed to update project:', e);
        }
    }
}));

// Setup AudioEngine state listener to sync playback state
if (typeof window !== 'undefined') {
    // Register callback once on client side
    setTimeout(() => {
        audioEngine.onStateChange((state) => {
            const store = useProjectStore.getState();
            // If audio context suspends while we think we're playing, stop
            if (state === 'suspended' && store.isPlaying) {
                logger.debug('AudioContext suspended - stopping playback');
                store.setIsPlaying(false);
                audioScheduler.stop();
            }
        });
    }, 0);
}

// Components needing 60fps time updates should use usePlaybackTime hook instead.
