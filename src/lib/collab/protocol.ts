// Collaboration protocol — message types and helpers

export type CollabEventType =
  | 'join-room'
  | 'leave-room'
  | 'user-joined'
  | 'user-left'
  | 'track-update'
  | 'track-add'
  | 'track-delete'
  | 'note-update'
  | 'note-add'
  | 'note-delete'
  | 'clip-update'
  | 'cursor-move'
  | 'playback-sync'
  | 'chat-message'
  | 'project-meta-update';

export interface CollabUser {
  id: string;
  name: string;
  avatar?: string;
  color: string; // Assigned cursor/highlight color
}

export interface CollabMessage {
  type: CollabEventType;
  userId: string;
  timestamp: number;
  payload: unknown;
}

export interface JoinRoomPayload {
  projectId: string;
  sessionId: string;
  user: CollabUser;
}

export interface TrackUpdatePayload {
  trackId: string;
  changes: Record<string, unknown>;
}

export interface NoteUpdatePayload {
  trackId: string;
  clipIndex: number;
  noteId: string;
  changes: Record<string, unknown>;
}

export interface CursorMovePayload {
  beat: number;
  trackIndex: number;
  user: CollabUser;
}

export interface ChatMessagePayload {
  text: string;
  user: CollabUser;
}

export interface PlaybackSyncPayload {
  isPlaying: boolean;
  beat: number;
  tempo: number;
}

// Assign deterministic colors based on user index
const COLLAB_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F1948A', '#82E0AA',
];

export function getCollabColor(index: number): string {
  return COLLAB_COLORS[index % COLLAB_COLORS.length];
}

// Simple last-write-wins merge for concurrent edits
export function mergeTrackUpdate(
  current: Record<string, unknown>,
  incoming: TrackUpdatePayload
): Record<string, unknown> {
  return { ...current, ...incoming.changes };
}

// Version vector for basic conflict detection
export interface VersionVector {
  [userId: string]: number;
}

export function incrementVersion(
  vector: VersionVector,
  userId: string
): VersionVector {
  return { ...vector, [userId]: (vector[userId] || 0) + 1 };
}

export function isNewerVersion(
  incoming: VersionVector,
  current: VersionVector
): boolean {
  return Object.entries(incoming).some(
    ([userId, version]) => version > (current[userId] || 0)
  );
}
