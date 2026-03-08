'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
// Note: tone engines are imported dynamically to avoid creating AudioContext on module load

import { Plus } from 'lucide-react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useWingman } from '../../hooks/useWingman';
import { useDragReorder } from '../../hooks/useDragReorder';
import { getPlaybackBeat } from '../../hooks/usePlaybackTime';
import { useProjectStore } from '../../store/useProjectStore';
import { audioEngine } from '../../lib/audioEngine';

import PianoRoll, { Note } from '../../components/daw/PianoRoll';
import PanKnob from '../../components/daw/PanKnob';
import VolumeMeter from '../../components/daw/VolumeMeter';
import AudioEditor from '../../components/daw/AudioEditor';
import TransportBar from '../../components/daw/TransportBar';
import SettingsModal from '../../components/daw/SettingsModal';
import WingmanPanel from '../../components/daw/WingmanPanel';
import TimelineRuler from '../../components/daw/TimelineRuler';
import SynthEditorPanel from '../../components/daw/SynthEditorPanel';
import { stemSeparator } from '../../lib/stemSeparator';

import MasterPlayhead from '../../components/daw/MasterPlayhead';
import TrackLane from '../../components/daw/TrackLane';
import TrackFXPanel from '../../components/daw/TrackFXPanel';
import AudioConversionModal from '../../components/daw/AudioConversionModal';
import ExportModal from '../../components/daw/ExportModal';
import MasteringModal from '../../components/daw/MasteringModal';
import CollabPanel from '../../components/daw/CollabPanel';
import AuthModal from '../../components/daw/auth/AuthModal';
import AddTrackModal from '../../components/daw/AddTrackModal';
import ContextMenu from '../../components/daw/ContextMenu';
import RenameModal from '../../components/daw/RenameModal';
import SoundBrowser from '../../components/daw/SoundBrowser';
import KeyboardShortcutsHelp from '../../components/daw/KeyboardShortcutsHelp';
import type { Track, Clip, MidiNote, TrackType, AudioWaveform } from '../../lib/types';
import { SOUND_TYPE_MAP, DEFAULT_TRACK_FX } from '../../lib/types';
import { logger } from '../../lib/logger';
import './daw.css';

import { TRACK_COLORS, SOUND_LIBRARY, type SoundCategoryType as SoundCategory } from '../../lib/constants';

// UI Type for casting the readonly constant
export type SubcategoryData = { readonly [subcategory: string]: readonly string[] } | readonly string[];

// Helper to flatten subcategories for compatibility
export function getAllSoundsInCategory(category: SoundCategory): readonly string[] {
  const data = SOUND_LIBRARY[category];
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Object.values(data).flat() as readonly string[];
}

export default function DAWPage() {
  const {
    tracks, setTracks, undo, redo,
    createProject, activeProject, isPlaying, togglePlay, setCurrentTime
  } = useProjectStore();

  // Computed from store state
  const canUndo = useProjectStore(s => s._past.length > 0);
  const canRedo = useProjectStore(s => s._future.length > 0);
  const lastAction = useProjectStore(s => s.lastAction);

  const blobUrlsRef = useRef<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Load tracks from localStorage AFTER hydration (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('drey-tracks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTracks(parsed, 'Load from storage');
        }
      }
      const savedEditorMode = localStorage.getItem('drey-editor-mode');
      if (savedEditorMode === 'simple' || savedEditorMode === 'advanced') {
        setEditorMode(savedEditorMode);
      }
    } catch (e) {
      logger.warn('Failed to load tracks from localStorage:', e);
    }
    setIsHydrated(true);
  }, [setTracks]);

  // Persist tracks to localStorage (debounced, only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem('drey-tracks', JSON.stringify(tracks));
      } catch (e) {
        logger.warn('Failed to save tracks to localStorage:', e);
      }
    }, 500); // Debounce 500ms
    return () => clearTimeout(timeout);
  }, [tracks, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('drey-editor-mode', editorMode);
    } catch (e) {
      logger.warn('Failed to save editor mode:', e);
    }
  }, [editorMode, isHydrated]);

  // Keyboard shortcuts (extracted to useKeyboardShortcuts hook)
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onTogglePlay: async () => {
      try {
        if (!isPlaying) {
          await audioEngine.initialize();
          await audioEngine.resume();
        } else {
          await audioEngine.suspend();
        }
        togglePlay();
      } catch (e) {
        logger.error('Failed to toggle playback:', e);
      }
    },
    onToggleHelp: () => setShowKeyboardHelp(prev => !prev),
  });

  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Synths');
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [masterVolume, setMasterVolume] = useState(85);
  const [gridDivision, setGridDivision] = useState<number>(4); // 1=1/1, 2=1/2, 4=1/4, 8=1/8, 16=1/16
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartBeatRef = useRef<number>(0);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const tapTimesRef = useRef<number[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; trackId: number } | null>(null);

  // Wingman AI assistant (extracted to useWingman hook)
  const wingman = useWingman({
    tracks, setTracks, activeProject, isPlaying,
    selectedTrackId, canUndo, canRedo, lastAction, undo, redo
  });

  // Drag reorder (extracted to useDragReorder hook)
  const drag = useDragReorder(tracks, (reordered) => setTracks(reordered, 'Reorder tracks'));

  // Rename modal state
  const [renameModal, setRenameModal] = useState<{ trackId: number; name: string } | null>(null);

  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [fxPanelTrackId, setFxPanelTrackId] = useState<number | null>(null);
  const [automationTrackIds, setAutomationTrackIds] = useState<Set<number>>(new Set());

  // Keyboard shortcuts help
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Loop region
  const [loopRegion, setLoopRegion] = useState<{ enabled: boolean; start: number; end: number }>({ enabled: false, start: 0, end: 8 });

  // Mastering, Collab, Auth state
  const [showMastering, setShowMastering] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [masteringBuffer, setMasteringBuffer] = useState<AudioBuffer | null>(null);
  const [collabInviteCode, setCollabInviteCode] = useState<string | null>(null);


  // Audio-to-MIDI conversion modal state
  const [conversionModal, setConversionModal] = useState<{
    file: File | Blob;
    targetTrackId: number;
  } | null>(null);

  const editingTrack = tracks.find(t => t.id === editingTrackId) || null;

  // Handle audio-to-MIDI conversion completion
  const handleConversionComplete = (notes: MidiNote[], targetTrackId: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== targetTrackId) return track;

      // Create new clip with converted notes
      const newClip: Clip = {
        start: 0,
        duration: Math.max(...notes.map(n => n.start + n.duration), 4),
        name: 'Converted from Audio',
        notes: notes.map((n, i) => ({ ...n, id: `conv-${Date.now()}-${i}` }))
      };

      return {
        ...track,
        clips: [...(track.clips || []), newClip]
      };
    }), 'Convert audio to MIDI');

    setConversionModal(null);
  };

  // Preload audio clips when tracks change
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    if (!activeProject) {
      createProject('Untitled Project');
    }
    // Preload project audio in background to reduce playback misses
    (async () => {
      try {
        const scheduler = (await import('../../lib/scheduler')).audioScheduler;
        tracksRef.current.forEach(t => t.clips.forEach((c: Clip) => { if (c.audioUrl) scheduler.preloadAudioClip(c.audioUrl); }));
      } catch { /* ignore in prod */ }
    })();
  }, [activeProject, createProject]);

  // Apply automation during playback
  useEffect(() => {
    if (!isPlaying) return;
    const hasAutomation = tracks.some(t => t.automation && t.automation.length > 0);
    if (!hasAutomation) return;
    let rafId: number;
    const tick = () => {
      const beat = getPlaybackBeat();
      audioEngine.applyAutomationAtBeat(tracks, beat);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, tracks]);

  const handleTogglePlay = useCallback(async () => {
    if (!isPlaying) {
      try {
        await audioEngine.initialize();
      } catch (e) {
        logger.error('Failed to initialize audio engine:', e);
        return;
      }
      await audioEngine.resume();
      // Dynamically import engines to avoid creating AudioContext before user gesture
      const engines = await import('../../lib/toneEngine');
      await Promise.all([
        engines.toneSynthEngine.initialize(),
        engines.toneDrumMachine.initialize(),
        engines.toneBassEngine.initialize(),
        engines.toneKeysEngine.initialize(),
        engines.toneVocalEngine.initialize(),
        engines.toneFXEngine.initialize()
      ]);
      // Pre-warm all track channels so meters read real data from the first beat
      audioEngine.preWarmChannels(tracks.map(t => t.id));
      togglePlay();
    } else {
      togglePlay();
      try {
        const engines = await import('../../lib/toneEngine');
        engines.toneSynthEngine.stopAll();
        engines.toneBassEngine.stopAll();
        engines.toneKeysEngine.stopAll();
        engines.toneVocalEngine.stopAll();
      } catch (e) {
        logger.warn('Failed to stop engines:', e);
      }
    }
  }, [isPlaying, togglePlay, tracks]);

  const handleTrackVolumeChange = useCallback((trackId: number, volume: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, volume, meterL: volume * 85, meterR: volume * 80 } : t
    ), 'Adjust track volume', { recordHistory: false });
  }, [setTracks]);

  const handleTrackMute = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  }, [setTracks]);

  const handleTrackSolo = useCallback((trackId: number, shiftKey: boolean = false) => {
    setTracks(prev => {
      const currentTrack = prev.find(t => t.id === trackId);
      const newSoloState = !currentTrack?.soloed;
      if (shiftKey) {
        return prev.map(t => t.id === trackId ? { ...t, soloed: newSoloState } : t);
      } else {
        return prev.map(t => t.id === trackId ? { ...t, soloed: newSoloState } : { ...t, soloed: false });
      }
    });
  }, [setTracks]);

  const handleSelectTrack = useCallback((trackId: number) => {
    setSelectedTrackId(trackId);
  }, []);

  const handleSetEditingTrack = useCallback((trackId: number) => {
    setEditingTrackId(trackId);
  }, []);

  const handleTrackPanChange = useCallback((trackId: number, pan: number) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, pan } : t), 'Adjust track pan', { recordHistory: false });
  }, [setTracks]);

  const handleClipResize = useCallback((trackId: number, clipIdx: number, newDuration: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      const clips = [...t.clips];
      clips[clipIdx] = { ...clips[clipIdx], duration: Math.max(0.1, newDuration) };
      return { ...t, clips };
    }), 'Resize clip', { recordHistory: false });
  }, [setTracks]);

  const handleClipMove = useCallback((trackId: number, clipIdx: number, newStart: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      const clips = [...t.clips];
      clips[clipIdx] = { ...clips[clipIdx], start: Math.max(0, newStart) };
      return { ...t, clips };
    }), 'Move clip', { recordHistory: false });
  }, [setTracks]);

  const handleAutomationEdit = useCallback((trackId: number, beat: number, value: number) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      const lanes = t.automation ? [...t.automation] : [];
      let volLane = lanes.find(l => l.param === 'volume');
      if (!volLane) {
        volLane = { param: 'volume', points: [{ beat: 0, value: t.volume }, { beat: 16, value: t.volume }] };
        lanes.push(volLane);
      }
      const points = [...volLane.points];
      const existing = points.findIndex(p => Math.abs(p.beat - beat) < 0.25);
      if (existing >= 0) {
        points[existing] = { beat, value };
      } else {
        points.push({ beat, value });
      }
      points.sort((a, b) => a.beat - b.beat);
      const updatedLanes = lanes.map(l => l.param === 'volume' ? { ...l, points } : l);
      return { ...t, automation: updatedLanes };
    }), 'Edit automation');
  }, [setTracks]);

  // Context menu handlers
  const handleTrackContextMenu = useCallback((e: React.MouseEvent, trackId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, trackId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleChangeTrackType = useCallback((trackId: number, newType: TrackType) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, type: newType, clips: [] } : t
    ), 'Change track type');
    setContextMenu(null);
  }, [setTracks]);

  const handleDuplicateTrack = useCallback((trackId: number) => {
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (!track) return prev;
      const newId = Math.max(0, ...prev.map(t => t.id)) + 1;
      const duplicate: Track = {
        ...track,
        id: newId,
        name: `${track.name} (Copy)`,
        clips: track.clips.map(c => ({
          ...c,
          notes: c.notes ? c.notes.map(n => ({ ...n })) : []
        }))
      };
      const idx = prev.findIndex(t => t.id === trackId);
      const newTracks = [...prev];
      newTracks.splice(idx + 1, 0, duplicate);
      return newTracks;
    }, 'Duplicate track');
    setContextMenu(null);
  }, [setTracks]);

  const handleDeleteTrack = useCallback((trackId: number) => {
    setTracks(prev => prev.filter(t => t.id !== trackId), 'Delete track');
    setContextMenu(null);
  }, [setTracks]);

  const handleRenameTrack = useCallback((trackId: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setRenameModal({ trackId, name: track.name });
    }
    setContextMenu(null);
  }, [tracks]);

  const confirmRename = useCallback(() => {
    if (renameModal && renameModal.name.trim()) {
      setTracks(prev => prev.map(t =>
        t.id === renameModal.trackId ? { ...t, name: renameModal.name.trim() } : t
      ), 'Rename track');
    }
    setRenameModal(null);
  }, [renameModal, setTracks]);

  const handleChangeColor = useCallback((trackId: number, color: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, color } : t
    ), 'Change track color');
    setContextMenu(null);
  }, [setTracks]);

  const handleClearClips = useCallback((trackId: number) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, clips: [] } : t
    ), 'Clear clips');
    setContextMenu(null);
  }, [setTracks]);

  const handleOpenFX = useCallback((trackId: number) => {
    setFxPanelTrackId(trackId);
    setContextMenu(null);
  }, []);

  const handleToggleAutomation = useCallback((trackId: number) => {
    setAutomationTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
        // Initialize automation lane if not present
        const track = tracks.find(t => t.id === trackId);
        if (track && (!track.automation || track.automation.length === 0)) {
          setTracks(prevTracks => prevTracks.map(t =>
            t.id === trackId ? {
              ...t,
              automation: [{ param: 'volume' as const, points: [
                { beat: 0, value: t.volume },
                { beat: 16, value: t.volume }
              ]}]
            } : t
          ), 'Add automation');
        }
      }
      return next;
    });
    setContextMenu(null);
  }, [tracks, setTracks]);

  // Drag reorder handlers
  // Audio Context Resume on Interaction
  useEffect(() => {
    const handleInteraction = async () => {
      await audioEngine.initialize();
      const context = audioEngine.getContext();
      if (context.state === 'suspended') {
        await context.resume();
        logger.debug('Audio Context Resumed via Interaction');
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    }
  }, []);

  const handleDrop = (e: React.DragEvent, targetTrackId: number) => {
    e.preventDefault();

    // Check if files were dropped (audio file for conversion)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const targetTrack = tracks.find(t => t.id === targetTrackId);

      // Audio file dropped on MIDI track - offer conversion
      if (file.type.startsWith('audio/') && targetTrack && targetTrack.type === 'midi') {
        setConversionModal({ file, targetTrackId });
        drag.handleDragEnd();
        return;
      }

      // Audio file dropped on audio track - import as audio clip
      if (file.type.startsWith('audio/') && targetTrack && targetTrack.type === 'audio') {
        importAudioFile(file, targetTrackId);
        drag.handleDragEnd();
        return;
      }

      // Audio file dropped on non-audio track or no track - create new audio track
      if (file.type.startsWith('audio/') && (!targetTrack || targetTrack.type !== 'midi')) {
        const newId = Math.max(...tracks.map(t => t.id), 0) + 1;
        importAudioFile(file, newId, true);
        drag.handleDragEnd();
        return;
      }
    }

    // Track reordering (delegated to useDragReorder hook)
    drag.handleDrop(e, targetTrackId);
  };

  // Play preview sound using Tone.js engines for professional quality
  const playPreviewSound = async (category: SoundCategory, sound: string) => {
    // Ensure audio engine is initialized (requires user gesture)
    await audioEngine.initialize();

    // Stop any previous sounds
    const engines = await import('../../lib/toneEngine');
    engines.toneSynthEngine.stopAll();
    engines.toneBassEngine.stopAll();
    engines.toneKeysEngine.stopAll();

    if (category === 'Synths') {
      // Play chord with selected synth preset (trackId=-1 for preview)
      await engines.toneSynthEngine.playChord(-1, sound, [60, 64, 67], '2n', 0.7);
    } else if (category === 'Keys') {
      // ToneKeysEngine uses playChord with (trackId, preset, notes, duration, velocity)
      await engines.toneKeysEngine.playChord(-1, sound, [60, 64, 67], '2n', 0.75);
    } else if (category === 'Bass') {
      // Each bass type plays at LOW octaves to showcase the bass character
      const bassPitches: Record<string, number> = {
        'Sub Bass': 24,       // C0 - DEEP sub (lowest)
        'Synth Bass': 28,     // E0 - punchy low
        'Pluck Bass': 31,     // G0 - plucky deep
        'Wobble Bass': 26,    // D0 - wobble sub
        'Reese Bass': 24,     // C0 - deep reese
        'FM Bass': 33,        // A0 - FM character
        'Acid Bass': 36,      // C1 - acid squelch
        'Fingered Bass': 29,  // F0 - fingered low
      };
      // ToneBassEngine uses playNote(trackId, note, duration, velocity, preset)
      await engines.toneBassEngine.playNote(-1, bassPitches[sound] || 24, '2n', 0.95, sound);
    } else if (category === 'Drums') {
      // Play a preview kick with the selected kit
      await engines.toneDrumMachine.playKick(-1, sound, 0.9);
    } else if (category === 'FX') {
      // ToneFXEngine.playFX(trackId, type, velocity)
      await engines.toneFXEngine.playFX(-1, sound, 0.8);
    } else if (category === 'Vocals') {
      // ToneVocalEngine.playVocal(trackId, note, sample)
      await engines.toneVocalEngine.playVocal(-1, 60, sound);
    }
  };

  // Apply sound to track on double-click
  const handleSoundDoubleClick = (category: SoundCategory, sound: string) => {
    const soundType = SOUND_TYPE_MAP[category];
    const selectedTrack = tracks.find(t => t.id === selectedTrackId);

    // Strict check for Drums: Always create new track if current is not drums
    if (category === 'Drums' && selectedTrack?.type !== 'drums') {
      createNewTrack('drums', sound);
      return;
    }

    if (selectedTrack && selectedTrack.type === soundType) {
      // Apply to current track if compatible
      setTracks(prev => prev.map(t =>
        t.id === selectedTrackId
          ? { ...t, instrument: sound, name: sound }
          : t
      ));
    } else {
      // Create new track with this instrument
      createNewTrack(soundType, sound);
    }
  };

  // Create new track
  const createNewTrack = (type: TrackType, instrument?: string) => {
    const newId = Math.max(...tracks.map(t => t.id), 0) + 1;
    const color = TRACK_COLORS[newId % TRACK_COLORS.length];
    const name = instrument || (type === 'drums' ? 'New Drums' : type === 'midi' ? 'New Synth' : 'New Audio');

    const newTrack: Track = {
      id: newId,
      name,
      type,
      color,
      volume: 0.75,
      pan: 0,
      muted: false,
      soloed: false,
      meterL: 60,
      meterR: 58,
      instrument,
      clips: []
    };

    setTracks(prev => [...prev, newTrack]);
    setSelectedTrackId(newId);
    setShowAddTrackModal(false);
  };

  // Import audio file as clip on a track
  const importAudioFile = async (file: File, trackId: number, createTrack = false) => {
    try {
      await audioEngine.initialize();
      const arrayBuffer = await file.arrayBuffer();
      const ctx = audioEngine.getContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const durationSecs = audioBuffer.duration;
      const bpm = activeProject?.tempo || 120;
      const durationBeats = Math.max(1, Math.ceil((durationSecs * bpm / 60) * 4) / 4);
      const peaks = stemSeparator.extractPeaks(audioBuffer, 100);
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.push(url);

      const newClip: Clip = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        start: 0,
        duration: durationBeats,
        audioUrl: url,
        waveform: { peaks }
      };

      if (createTrack) {
        const newTrack: Track = {
          id: trackId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'audio',
          color: '#ed4245',
          volume: 0.8,
          pan: 0,
          muted: false,
          soloed: false,
          meterL: 0,
          meterR: 0,
          instrument: 'Audio',
          clips: [newClip]
        };
        setTracks(prev => [...prev, newTrack], 'Import audio file');
      } else {
        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
        ), 'Import audio file');
      }
      logger.info(`Imported audio: ${file.name} (${durationBeats.toFixed(1)} beats)`);
    } catch (e) {
      logger.error('Failed to import audio file:', e);
    }
  };

  const updateTrackNotes = useCallback((trackId: number, newNotes: Note[]) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;

      // If no clips exist, create a default one
      if (t.clips.length === 0) {
        return {
          ...t,
          clips: [{
            start: 0,
            duration: 16, // 4 bars default
            name: `${t.name} Pattern`,
            notes: newNotes
          }]
        };
      }

      // Update existing first clip
      const clips = [...t.clips];
      clips[0] = { ...clips[0], notes: newNotes };
      return { ...t, clips };
    }));
  }, [setTracks]);

  const handlePianoRollClose = useCallback(() => {
    setEditingTrackId(null);
  }, []);

  const handleMetronomeToggle = useCallback(() => {
    setMetronomeOn(prev => {
      const next = !prev;
      audioEngine.setMetronome(next);
      return next;
    });
  }, []);

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    // Reset if gap > 2 seconds
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [];
    }
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length >= 3) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 20 && bpm <= 300) {
        const { updateProject } = useProjectStore.getState();
        updateProject({ tempo: bpm });
      }
      // Keep only last 8 taps
      if (tapTimesRef.current.length > 8) tapTimesRef.current = tapTimesRef.current.slice(-8);
    }
  }, []);

  const handleLoopToggle = useCallback(async () => {
    setLoopRegion(prev => {
      const next = { ...prev, enabled: !prev.enabled };
      import('../../lib/scheduler').then(m => m.audioScheduler.setLoop(next.enabled, next.start, next.end));
      return next;
    });
  }, []);

  const handleLoopRegionChange = useCallback(async (start: number, end: number) => {
    setLoopRegion(prev => {
      const next = { ...prev, start, end };
      import('../../lib/scheduler').then(m => m.audioScheduler.setLoop(next.enabled, start, end));
      return next;
    });
  }, []);

  const handleToggleRecord = useCallback(async () => {
    if (!isRecording) {
      // Start recording
      await audioEngine.initialize();
      await audioEngine.startRecording();
      setIsRecording(true);
      // Track the beat position where recording started
      const store = useProjectStore;
      recordingStartBeatRef.current = store.getState().currentTime * ((activeProject?.tempo || 120) / 60);
    } else {
      // Stop recording and add clip
      const blob = await audioEngine.stopRecording();
      setIsRecording(false);
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.push(url);
        const bpm = activeProject?.tempo || 120;

        // Decode blob to get real duration and waveform
        let durationBeats = 4;
        let peaks = Array.from({ length: 100 }, () => Math.random() * 0.5 + 0.1);
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const ctx = audioEngine.getContext();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const durationSecs = audioBuffer.duration;
          durationBeats = Math.max(1, Math.ceil((durationSecs * bpm / 60) * 4) / 4); // round to nearest 16th
          peaks = stemSeparator.extractPeaks(audioBuffer, 100);
        } catch (e) {
          logger.warn('Could not decode recording for waveform:', e);
        }

        // Find or create an audio track
        setTracks(prev => {
          const existingAudio = prev.find(t => t.type === 'audio');
          const targetId = existingAudio?.id ?? (Math.max(...prev.map(t => t.id), 0) + 1);
          const newClip = {
            name: `Recording ${new Date().toLocaleTimeString()}`,
            start: recordingStartBeatRef.current,
            duration: durationBeats,
            audioUrl: url,
            waveform: { peaks }
          };
          if (existingAudio) {
            return prev.map(t => t.id === targetId ? { ...t, clips: [...t.clips, newClip] } : t);
          } else {
            const newTrack: Track = {
              id: targetId,
              name: 'Recording',
              type: 'audio',
              color: '#ed4245',
              volume: 0.8,
              pan: 0,
              muted: false,
              soloed: false,
              meterL: 0,
              meterR: 0,
              instrument: 'Mic',
              clips: [newClip]
            };
            return [...prev, newTrack];
          }
        });
      }
    }
  }, [isRecording, activeProject, setTracks]);

  const handlePianoRollNotesChange = useCallback((newNotes: Note[]) => {
    if (editingTrackId !== null) {
      updateTrackNotes(editingTrackId, newNotes);
    }
  }, [editingTrackId, updateTrackNotes]);

  // Open mastering — render current project to buffer first
  const handleOpenMastering = useCallback(async () => {
    try {
      await audioEngine.initialize();
      const buffer = await audioEngine.exportToWav(tracks, activeProject?.tempo || 120);
      if (buffer) {
        setMasteringBuffer(buffer);
        setShowMastering(true);
      }
    } catch (e) {
      logger.error('Failed to prepare mastering:', e);
      // Open anyway with null buffer — user can try again
      setShowMastering(true);
    }
  }, [tracks, activeProject?.tempo]);

  // Collab session management
  const handleStartCollabSession = useCallback(async () => {
    // For now, just open the collab panel
    setShowCollab(true);
  }, []);

  const PIXELS_PER_BEAT = 50;
  const hasSoloed = tracks.some(t => t.soloed);
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const showSynthEditor = editorMode === 'advanced' && selectedTrack && selectedTrack.type === 'midi' && selectedTrack.instrument;

  if (!isHydrated) {
    return (
      <div
        className="daw-container"
        style={{ display: 'grid', placeItems: 'center', background: 'var(--bg-deep)', color: 'var(--text-dim)' }}
      >
        Loading Drey...
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="daw-container" role="application" aria-label="Drey Digital Audio Workstation">
      {/* Add Track Modal */}
      {showAddTrackModal && <AddTrackModal onClose={() => setShowAddTrackModal(false)} onCreateTrack={createNewTrack} />}

      {/* PianoRoll Editor */}
      {editingTrack && editingTrack.type === 'audio' ? (
        <AudioEditor
          track={editingTrack}
          onTrackChange={(updated) => setTracks(
            prev => prev.map(t => t.id === updated.id ? updated : t),
            'Edit audio clip',
            { recordHistory: false }
          )}
          advancedMode={editorMode === 'advanced'}
          onClose={() => setEditingTrackId(null)}
        />
      ) : editingTrack && (
        <PianoRoll
          trackId={editingTrack.id}
          trackName={editingTrack.name}
          trackColor={editingTrack.color}
          trackType={editingTrack.type}
          instrument={editingTrack.instrument}
          notes={editingTrack.clips[0]?.notes || []}
          onNotesChange={handlePianoRollNotesChange}
          advancedMode={editorMode === 'advanced'}
          onClose={handlePianoRollClose}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          trackId={contextMenu.trackId}
          onClose={closeContextMenu}
          onRename={handleRenameTrack}
          onChangeType={handleChangeTrackType}
          onChangeColor={handleChangeColor}
          onDuplicate={handleDuplicateTrack}
          onOpenFX={handleOpenFX}
          onToggleAutomation={handleToggleAutomation}
          hasAutomation={automationTrackIds.has(contextMenu.trackId)}
          onClearClips={handleClearClips}
          onDelete={handleDeleteTrack}
          colors={TRACK_COLORS}
        />
      )}

      {/* Rename Modal */}
      {renameModal && (
        <RenameModal
          name={renameModal.name}
          onNameChange={(name) => setRenameModal({ ...renameModal, name })}
          onConfirm={confirmRename}
          onClose={() => setRenameModal(null)}
        />
      )}

      {/* Toolbar */}
      <TransportBar
        projectName={activeProject?.name || 'Untitled'}
        tempo={activeProject?.tempo || 120}
        timeSignature={activeProject?.timeSignature || '4/4'}
        isPlaying={isPlaying}
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        loopEnabled={loopRegion.enabled}
        loopStart={loopRegion.start}
        loopEnd={loopRegion.end}
        canUndo={canUndo}
        canRedo={canRedo}
        gridDivision={gridDivision}
        onTogglePlay={handleTogglePlay}
        onStop={() => setCurrentTime(0)}
        onToggleRecord={handleToggleRecord}
        onToggleMetronome={handleMetronomeToggle}
        onToggleLoop={handleLoopToggle}
        onTapTempo={handleTapTempo}
        onUndo={undo}
        onRedo={redo}
        onGridDivisionChange={setGridDivision}
        onOpenSettings={() => setShowSettings(true)}
        onOpenExport={() => setShowExport(true)}
        onOpenMastering={handleOpenMastering}
        onOpenCollab={() => setShowCollab(true)}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Wingman Panel */}
        <WingmanPanel
          project={activeProject}
          tracks={tracks}
          selectedTrackId={selectedTrackId}
          isPlaying={isPlaying}
          onExecuteActions={wingman.executeWingmanActions}
        />


        {/* Timeline */}
        <main className="timeline-section">
          <TimelineRuler
            pixelsPerBeat={PIXELS_PER_BEAT}
            tempo={activeProject?.tempo || 120}
            loopEnabled={loopRegion.enabled}
            loopStart={loopRegion.start}
            loopEnd={loopRegion.end}
            onSeek={setCurrentTime}
            onLoopRegionChange={handleLoopRegionChange}
            onLoopToggle={handleLoopToggle}
          />
          <div className="track-lanes">
            {/* Grid lines overlay */}
            <div className="grid-lines" style={{ left: '200px' }}>
              {Array.from({ length: 17 * gridDivision }, (_, i) => (
                <div
                  key={i}
                  className={`grid-line ${i % gridDivision === 0 ? 'major' : 'minor'}`}
                  style={{ left: `${(i / gridDivision) * PIXELS_PER_BEAT}px` }}
                />
              ))}
            </div>
            {tracks.map(track => (
              <TrackLane
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                isDragging={drag.draggedId === track.id}
                isDropTarget={drag.dropTargetId === track.id}
                isGreyed={hasSoloed && !track.soloed}
                isPlaying={isPlaying}
                showAutomation={automationTrackIds.has(track.id)}
                onSelect={handleSelectTrack}
                onDoubleClick={handleSetEditingTrack}
                onContextMenu={handleTrackContextMenu}
                onMute={handleTrackMute}
                onSolo={handleTrackSolo}
                onVolumeChange={handleTrackVolumeChange}
                onPanChange={handleTrackPanChange}
                onDragStart={drag.handleDragStart}
                onDragOver={drag.handleDragOver}
                onDragLeave={drag.handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={drag.handleDragEnd}
                onClipResize={handleClipResize}
                onClipMove={handleClipMove}
                onAutomationEdit={handleAutomationEdit}
              />
            ))}
            {/* Empty State / Add Track Area */}
            <div
              className="empty-track-area"
              onClick={() => setShowAddTrackModal(true)}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowAddTrackModal(true);
              }}
            >
              <div className="empty-state-content">
                <Plus size={24} />
                <span>Add New Track</span>
                <small>Click or drop samples here</small>
              </div>
            </div>

            {/* Playhead - uses animated playbackBeat for smooth movement */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 201, right: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
              <MasterPlayhead pixelsPerBeat={PIXELS_PER_BEAT} height={900} scrollLeft={0} />
            </div>
          </div>
        </main>

        {/* Synth Editor Panel (sidebar) */}
        {showSynthEditor && (
          <aside style={{ width: 360, padding: 12 }}>
            <SynthEditorPanel presetName={selectedTrack?.instrument ?? ''} />
          </aside>
        )}


        {/* Browser */}
        <SoundBrowser
          expandedCategory={expandedCategory}
          onExpandCategory={setExpandedCategory}
          onPreview={playPreviewSound}
          onApply={handleSoundDoubleClick}
        />


      </div>



      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        editorMode={editorMode}
        onEditorModeChange={setEditorMode}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        tracks={tracks}
        tempo={activeProject?.tempo || 120}
      />

      {conversionModal && (
        <AudioConversionModal
          audioFile={conversionModal.file}
          onClose={() => setConversionModal(null)}
          onConversionComplete={(notes) => handleConversionComplete(notes, conversionModal.targetTrackId)}
        />
      )}

      {/* Per-Track FX Panel */}
      {fxPanelTrackId !== null && (() => {
        const fxTrack = tracks.find(t => t.id === fxPanelTrackId);
        if (!fxTrack) return null;
        return (
          <div className="fx-panel-overlay" onClick={() => setFxPanelTrackId(null)}>
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <TrackFXPanel
                trackId={fxPanelTrackId}
                trackName={fxTrack.name}
                fx={fxTrack.fx || DEFAULT_TRACK_FX}
                onFXChange={(newFx) => {
                  setTracks(prev => prev.map(t =>
                    t.id === fxPanelTrackId ? { ...t, fx: newFx } : t
                  ), 'Update track FX');
                }}
                onClose={() => setFxPanelTrackId(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />}

      {/* AI Mastering Modal */}
      <MasteringModal
        isOpen={showMastering}
        onClose={() => setShowMastering(false)}
        audioBuffer={masteringBuffer}
      />

      {/* Collaboration Panel */}
      <CollabPanel
        isOpen={showCollab}
        onClose={() => setShowCollab(false)}
        connected={false}
        users={[]}
        messages={[]}
        inviteCode={collabInviteCode}
        onSendMessage={() => {}}
        onStartSession={handleStartCollabSession}
        onJoinSession={(code) => { setCollabInviteCode(code); }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => { setShowAuth(false); }}
      />


    </div>
    </ErrorBoundary>
  );
}
