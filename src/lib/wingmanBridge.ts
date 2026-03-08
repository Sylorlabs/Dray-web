// Wingman Bridge: connecting the DAW state to the AI
// Sound library type - avoiding circular dependency
// Sound library type - avoiding circular dependency
type SubcategoryData = { readonly [subcategory: string]: readonly string[] } | readonly string[];
type SoundLibraryType = Record<string, SubcategoryData>;

import { logger } from './logger';


// --- Types ---

export interface InputTrack {
    id: number;
    name: string;
    type: string;
    instrument?: string;
    volume: number;
    pan: number;
    muted: boolean;
    soloed: boolean;
    clips: any[];
}

export interface ProjectContext {
    projectName: string;
    tempo: number;
    timeSignature: string;
    isPlaying: boolean;
    currentTime: number;
    tracks: SimplifiedTrack[];
    selectedTrackId: number | null;
    availableInstruments: SoundLibraryType;
    // Undo/Redo state
    canUndo: boolean;
    canRedo: boolean;
    lastAction: string | null;
}

export interface SimplifiedTrack {
    id: number;
    name: string;
    type: string;
    instrument: string | undefined;
    volume: number; // 0-1
    pan: number; // -100 to 100
    muted: boolean;
    soloed: boolean;
    clipCount: number;
}

export type WingmanActionType =
    | 'create_track'
    | 'add_midi_clip'
    | 'add_audio_clip'
    | 'set_volume'
    | 'set_pan'
    | 'mute_track'
    | 'solo_track'
    | 'play'
    | 'stop'
    | 'generate_pattern'
    | 'modify_note'
    | 'generate_sound'
    | 'undo'
    | 'redo';

export interface WingmanAction {
    type: WingmanActionType;
    payload: any;
}

// Action Payloads
export interface CreateTrackPayload {
    type: 'audio' | 'midi' | 'drums';
    name?: string;
    instrument?: string;
}

export interface AddMidiClipPayload {
    trackId: number;
    name: string;
    start: number; // in beats
    duration: number; // in beats
    notes: {
        id?: string;
        pitch: number;
        start: number;
        duration: number;
        velocity: number
    }[];
}

export interface AddAudioClipPayload {
    trackId: number;
    start: number;
    sampleName: string;
}

export interface SetParamPayload {
    trackId: number;
    value: number;
}

export interface GeneratePatternPayload {
    trackId: number;
    style: string;
    key?: string;
    scale?: string;
    length?: number;
}

export interface GenerateSoundPayload {
    name: string;
    duration: number; // seconds
    code: string; // JavaScript code to generate the buffer
}

export interface ModifyNotePayload {
    trackId: number;
    noteId: string;
    pitch?: number;
    start?: number;
    duration?: number;
    velocity?: number;
}

// --- Helpers ---

export const getProjectContext = (
    project: { name?: string; tempo?: number; timeSignature?: string } | null,
    tracks: InputTrack[],
    isPlaying: boolean,
    currentTime: number,
    selectedTrackId: number | null,
    soundLibrary: SoundLibraryType,
    canUndo: boolean = false,
    canRedo: boolean = false,
    lastAction: string | null = null
): ProjectContext => {
    return {
        projectName: project?.name || 'Untitled',
        tempo: project?.tempo || 120,
        timeSignature: project?.timeSignature || '4/4',
        isPlaying,
        currentTime,
        selectedTrackId,
        tracks: tracks.map(t => ({
            id: t.id,
            name: t.name,
            type: t.type,
            instrument: t.instrument,
            volume: t.volume,
            pan: t.pan,
            muted: t.muted,
            soloed: t.soloed,
            clipCount: t.clips.length
        })),
        availableInstruments: soundLibrary,
        canUndo,
        canRedo,
        lastAction
    };
};

// Response Parser
export const parseWingmanResponse = (response: string): { text: string; actions: WingmanAction[] } => {
    let actions: WingmanAction[] = [];
    let text = response;

    // Look for JSON block in the response
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || response.match(/(\{[\s\S]*\})/);

    if (jsonMatch) {
        try {
            const jsonStr = jsonMatch[1];
            const parsed = JSON.parse(jsonStr);

            if (parsed.actions && Array.isArray(parsed.actions)) {
                actions = parsed.actions;
                // Remove the JSON block from the text to show the user a clean message
                text = response.replace(jsonMatch[0], '').trim();
            } else if (parsed.type && parsed.payload) {
                // Single action
                actions = [parsed];
                text = response.replace(jsonMatch[0], '').trim();
            }
        } catch (e) {
            logger.error("Failed to parse Wingman actions", e);
        }
    }

    return { text, actions };
};
