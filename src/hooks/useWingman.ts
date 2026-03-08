import { useState, useCallback, useEffect, useRef } from 'react';
import { getProjectContext, parseWingmanResponse } from '../lib/wingmanBridge';
import { grokService } from '../lib/grokService';
import type { GrokMessage } from '../lib/grokService';
import { audioEngine } from '../lib/audioEngine';
import { stemSeparator } from '../lib/stemSeparator';
import { PatternGenerators } from '../lib/patternGenerators';
import { SOUND_LIBRARY } from '../lib/constants';
import type { Track, MidiNote, Project } from '../lib/types';
import { logger } from '../lib/logger';

type WingmanMessage = { role: 'ai' | 'user'; text: string };

interface WingmanAction {
  type: string;
  payload: Record<string, unknown>;
}

const TRACK_COLORS = ['#eb459e', '#5865f2', '#57f287', '#fee75c', '#ed4245', '#9b59b6', '#3498db', '#1abc9c'];

export interface UseWingmanOptions {
  tracks: Track[];
  setTracks: (
    newState: Track[] | ((prev: Track[]) => Track[]),
    actionName?: string,
    options?: { recordHistory?: boolean }
  ) => void;
  activeProject: Project | null;
  isPlaying: boolean;
  selectedTrackId: number | null;
  canUndo: boolean;
  canRedo: boolean;
  lastAction: string | null;
  undo: () => void;
  redo: () => void;
}

export function useWingman(options: UseWingmanOptions) {
  const {
    tracks, setTracks, activeProject, isPlaying,
    selectedTrackId, canUndo, canRedo, lastAction, undo, redo
  } = options;

  const [wingmanOpen, setWingmanOpen] = useState(true);
  const [wingmanInput, setWingmanInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wingmanMessages, setWingmanMessages] = useState<WingmanMessage[]>([
    { role: 'ai', text: "Hey! I'm Wingman, your AI producer. What would you like to create today?" }
  ]);

  // Track object URLs for cleanup (BUG 5 fix)
  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const isValidAction = (action: unknown): action is WingmanAction => {
    return (
      typeof action === 'object' && action !== null &&
      'type' in action && typeof (action as WingmanAction).type === 'string' &&
      'payload' in action && typeof (action as WingmanAction).payload === 'object'
    );
  };

  // Execute the list of actions returned by the AI
  const executeWingmanActions = useCallback((actions: WingmanAction[]) => {
    const validActions = actions.filter(isValidAction);
    if (validActions.length !== actions.length) {
      logger.warn(`Filtered ${actions.length - validActions.length} invalid wingman actions`);
    }
    // BUG 1 fix: Handle undo/redo BEFORE the setTracks batch
    const undoRedoActions = validActions.filter(a => a.type === 'undo' || a.type === 'redo');
    const trackActions = validActions.filter(a => a.type !== 'undo' && a.type !== 'redo');

    undoRedoActions.forEach(action => {
      if (action.type === 'undo') undo();
      if (action.type === 'redo') redo();
    });

    // BUG 2 fix: Separate generate_sound (async) from synchronous actions
    const generateSoundActions = trackActions.filter(a => a.type === 'generate_sound');
    const syncActions = trackActions.filter(a => a.type !== 'generate_sound');

    if (syncActions.length > 0) {
      setTracks(currentTracks => {
        let newTracks = [...currentTracks];

        syncActions.forEach(action => {
          try {
            switch (action.type) {
              case 'create_track': {
                const { type, name, instrument } = action.payload as { type?: string; name?: string; instrument?: string };
                const newId = Math.max(0, ...newTracks.map(t => t.id)) + 1;
                const color = TRACK_COLORS[newId % TRACK_COLORS.length];
                newTracks.push({
                  id: newId,
                  name: name || `New ${type}`,
                  type: type || 'midi',
                  color,
                  volume: 0.75,
                  pan: 0,
                  muted: false,
                  soloed: false,
                  meterL: 0,
                  meterR: 0,
                  instrument: instrument || 'Grand Piano',
                  clips: []
                });
                break;
              }
              case 'add_midi_clip': {
                const { trackId, name, start, duration, notes } = action.payload as {
                  trackId: number; name?: string; start?: number; duration?: number;
                  notes?: { id?: string; velocity?: number; [key: string]: unknown }[];
                };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                  newTracks[trackIndex] = {
                    ...newTracks[trackIndex],
                    clips: [
                      ...newTracks[trackIndex].clips,
                      {
                        name: name || 'Clip',
                        start: start || 0,
                        duration: duration || 4,
                        notes: (notes || []).map((n: { id?: string; velocity?: number; [key: string]: unknown }) => ({
                          ...n,
                          id: n.id || `wm-${Date.now()}-${Math.random()}`,
                          velocity: n.velocity || 0.8
                        }))
                      }
                    ]
                  };
                }
                break;
              }
              case 'set_volume': {
                const { trackId, value } = action.payload as { trackId: number; value: number };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                  newTracks[trackIndex] = { ...newTracks[trackIndex], volume: Math.max(0, Math.min(1, value)) };
                }
                break;
              }
              case 'set_pan': {
                const { trackId, value } = action.payload as { trackId: number; value: number };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                  newTracks[trackIndex] = { ...newTracks[trackIndex], pan: Math.max(-100, Math.min(100, value)) };
                }
                break;
              }
              case 'mute_track': {
                const { trackId } = action.payload as { trackId: number };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                  newTracks[trackIndex] = { ...newTracks[trackIndex], muted: !newTracks[trackIndex].muted };
                }
                break;
              }
              case 'solo_track': {
                const { trackId } = action.payload as { trackId: number };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                  newTracks[trackIndex] = { ...newTracks[trackIndex], soloed: !newTracks[trackIndex].soloed };
                }
                break;
              }
              case 'add_audio_clip': {
                const { trackId, start, sampleName } = action.payload as { trackId: number; start?: number; sampleName?: string };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                  const duration = 4; // Placeholder
                  newTracks[trackIndex] = {
                    ...newTracks[trackIndex],
                    clips: [
                      ...newTracks[trackIndex].clips,
                      {
                        name: sampleName || 'Audio Clip',
                        start: start || 0,
                        duration,
                        waveform: { peaks: Array.from({ length: 100 }, () => Math.random()) }
                      }
                    ]
                  };
                }
                break;
              }
              case 'generate_pattern': {
                const { trackId, style, key, scale, length } = action.payload as {
                  trackId: number; style: string; key?: string; scale?: string; length?: number;
                };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);

                if (trackIndex !== -1) {
                  const track = newTracks[trackIndex];
                  let notes: MidiNote[] = [];

                  if (track.type === 'drums' || style.includes('trap') || style.includes('house')) {
                    notes = PatternGenerators.generateDrumPattern(style, length || 4);
                  } else {
                    notes = PatternGenerators.generateChordProgression({ key: key || 'C', scale: scale || 'Minor', mood: 'emotional', length: length || 4 });
                  }

                  const clipNotes = notes.map((n, idx) => ({
                    id: `gen-${Date.now()}-${idx}`,
                    pitch: n.pitch,
                    start: n.start,
                    duration: n.duration,
                    velocity: n.velocity
                  }));

                  newTracks[trackIndex] = {
                    ...track,
                    clips: [...track.clips, {
                      name: `${style} Pattern`,
                      start: 0,
                      duration: length || 4,
                      notes: clipNotes
                    }]
                  };
                }
                break;
              }
              case 'modify_note': {
                const { trackId, noteId, pitch, start, duration, velocity } = action.payload as {
                  trackId: number; noteId: string; pitch?: number; start?: number; duration?: number; velocity?: number;
                };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);

                if (trackIndex !== -1) {
                  const track = newTracks[trackIndex];
                  const clips = track.clips.map(clip => {
                    if (clip.notes) {
                      const noteIndex = clip.notes.findIndex(n => n.id === noteId);
                      if (noteIndex !== -1) {
                        const newNotes = [...clip.notes];
                        const note = newNotes[noteIndex];
                        newNotes[noteIndex] = {
                          ...note,
                          pitch: pitch !== undefined ? pitch : note.pitch,
                          start: start !== undefined ? start : note.start,
                          duration: duration !== undefined ? duration : note.duration,
                          velocity: velocity !== undefined ? velocity : note.velocity
                        };
                        return { ...clip, notes: newNotes };
                      }
                    }
                    return clip;
                  });
                  newTracks[trackIndex] = { ...track, clips };
                }
                break;
              }
              case 'delete_track': {
                const { trackId } = action.payload as { trackId: number };
                newTracks = newTracks.filter(t => t.id !== trackId);
                break;
              }
              case 'delete_notes': {
                const { trackId, noteIds } = action.payload as { trackId: number; noteIds: string[] };
                const trackIndex = newTracks.findIndex(t => t.id === trackId);

                if (trackIndex !== -1) {
                  const track = newTracks[trackIndex];
                  const clips = track.clips.map(clip => {
                    if (clip.notes) {
                      return {
                        ...clip,
                        notes: clip.notes.filter(n => !noteIds.includes(n.id))
                      };
                    }
                    return clip;
                  });
                  newTracks[trackIndex] = { ...track, clips };
                }
                break;
              }
            }
          } catch (e) {
            logger.error("Error executing action", action, e);
          }
        });

        return newTracks;
      });
    }

    // BUG 2 fix: Process async generate_sound actions outside setTracks
    generateSoundActions.forEach(action => {
      logger.debug('Generating sound from code...');
      setIsLoading(true);

      const { name, duration } = action.payload as { name?: string; duration: number };
      (async () => {
        try {
          const sampleRate = 44100;
          const length = Math.ceil(duration * sampleRate);
          const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

          const gain = offlineCtx.createGain();
          gain.gain.value = 0.5;
          gain.connect(offlineCtx.destination);

          const osc = offlineCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 220;
          const osc2 = offlineCtx.createOscillator();
          osc2.type = 'sine';
          osc2.frequency.value = 220 * 1.005;

          const g2 = offlineCtx.createGain();
          g2.gain.value = 0.5;

          osc.connect(g2);
          osc2.connect(g2);
          g2.connect(gain);

          const now = 0;
          osc.start(now);
          osc2.start(now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.02);

          osc.stop(now + duration);
          osc2.stop(now + duration);

          const buffer = await offlineCtx.startRendering();
          const wavBlob = stemSeparator.audioBufferToWav(buffer);
          const url = URL.createObjectURL(wavBlob);
          // BUG 5 fix: track object URL for cleanup
          objectUrlsRef.current.push(url);

          const bpm = activeProject?.tempo || 120;
          const beats = duration * (bpm / 60);

          setTracks(currentTracks => {
            let newTracks = [...currentTracks];
            let trackId = selectedTrackId;

            // Create audio track if needed
            const targetTrack = newTracks.find(t => t.id === trackId);
            if (!targetTrack || targetTrack.type !== 'audio') {
              const newId = Math.max(0, ...newTracks.map(t => t.id)) + 1;
              trackId = newId;
              newTracks.push({
                id: newId,
                name: 'Generated Audio',
                type: 'audio',
                color: '#4ec9b0',
                volume: 0.8,
                pan: 0,
                muted: false,
                soloed: false,
                meterL: 0,
                meterR: 0,
                clips: [],
                instrument: 'Audio'
              } as Track);
            }

            // Add the clip to the track
            const trackIndex = newTracks.findIndex(t => t.id === trackId);
            if (trackIndex !== -1) {
              newTracks[trackIndex] = {
                ...newTracks[trackIndex],
                clips: [...newTracks[trackIndex].clips, {
                  id: `clip-gen-${Date.now()}`,
                  name: name || 'Generated Sound',
                  start: 0,
                  duration: beats,
                  audioUrl: url,
                  waveform: { peaks: stemSeparator.extractPeaks(buffer, 100) }
                } as Record<string, unknown>]
              };
            }

            return newTracks;
          }, 'Generate sound');

          setIsLoading(false);

        } catch (e) {
          logger.error('Generation execution error:', e);
          setIsLoading(false);
        }
      })();
    });
  }, [undo, redo, setTracks, selectedTrackId, activeProject]);

  const handleWingmanSend = useCallback(async () => {
    if (!wingmanInput.trim() || isLoading) return;

    // 1. Prepare user message
    const userMsg = { role: 'user' as const, text: wingmanInput };
    setWingmanMessages(prev => [...prev, userMsg]);
    setWingmanInput('');
    setIsLoading(true);

    try {
      // 2. Build Context
      const context = getProjectContext(
        activeProject,
        tracks,
        isPlaying,
        // Use AudioContext time if available, otherwise 0
        audioEngine.getState() !== null ? audioEngine.getContext().currentTime : 0,
        selectedTrackId,
        SOUND_LIBRARY,
        canUndo,
        canRedo,
        lastAction
      );

      // 3. Call Grok
      const chatHistory: GrokMessage[] = wingmanMessages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.text
      }));

      chatHistory.push({ role: 'user', content: userMsg.text });

      const rawResponse = await grokService.chat(chatHistory, context, false);

      // 4. Parse Response for Actions
      const { text, actions } = parseWingmanResponse(rawResponse);

      // 5. Display Text Response
      setWingmanMessages(prev => [...prev, { role: 'ai', text }]);

      // 6. Execute Actions
      if (actions.length > 0) {
        logger.debug('Executing Wingman Actions:', actions);
        executeWingmanActions(actions);
      }

    } catch (err) {
      logger.error(err);
      setWingmanMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an issue connecting to my brain." }]);
    } finally {
      setIsLoading(false);
    }
  }, [wingmanInput, isLoading, wingmanMessages, activeProject, tracks, isPlaying, selectedTrackId, canUndo, canRedo, lastAction, executeWingmanActions]);

  const handleSuggestionClick = (type: string) => {
    const prompts: Record<string, string> = {
      beat: 'Generate a hard-hitting trap beat at 140 BPM',
      melody: 'Create a catchy melody for my track',
      mix: 'Help me mix and master this track'
    };
    setWingmanInput(prompts[type] || '');
  };

  return {
    wingmanOpen,
    setWingmanOpen,
    wingmanMessages,
    wingmanInput,
    setWingmanInput,
    isLoading,
    handleWingmanSend,
    executeWingmanActions,
    handleSuggestionClick,
  };
}
