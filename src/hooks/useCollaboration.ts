'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  CollabUser,
  CollabMessage,
  CursorMovePayload,
  ChatMessagePayload,
  TrackUpdatePayload,
} from '@/lib/collab/protocol';
import { getCollabColor } from '@/lib/collab/protocol';

interface UseCollaborationOptions {
  projectId: string | null;
  sessionId: string | null;
  user: { id: string; name: string; avatar?: string } | null;
  onTrackUpdate?: (payload: TrackUpdatePayload) => void;
  onNoteUpdate?: (payload: CollabMessage) => void;
  onPlaybackSync?: (payload: CollabMessage) => void;
}

interface CollabState {
  connected: boolean;
  users: CollabUser[];
  cursors: Map<string, CursorMovePayload>;
  messages: ChatMessagePayload[];
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { projectId, sessionId, user, onTrackUpdate, onNoteUpdate, onPlaybackSync } = options;
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<CollabState>({
    connected: false,
    users: [],
    cursors: new Map(),
    messages: [],
  });

  const collabUser = useRef<CollabUser | null>(null);

  // Connect to collab server
  useEffect(() => {
    if (!projectId || !sessionId || !user) return;

    const socket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    collabUser.current = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      color: getCollabColor(0),
    };

    socket.on('connect', () => {
      setState((s) => ({ ...s, connected: true }));
      socket.emit('join-room', {
        projectId,
        sessionId,
        user: collabUser.current,
      });
    });

    socket.on('disconnect', () => {
      setState((s) => ({ ...s, connected: false }));
    });

    socket.on('user-joined', (data: { user: CollabUser; users: CollabUser[] }) => {
      setState((s) => ({ ...s, users: data.users }));
    });

    socket.on('user-left', (data: { userId: string; users: CollabUser[] }) => {
      setState((s) => {
        const cursors = new Map(s.cursors);
        cursors.delete(data.userId);
        return { ...s, users: data.users, cursors };
      });
    });

    socket.on('track-update', (payload: TrackUpdatePayload) => {
      onTrackUpdate?.(payload);
    });

    socket.on('note-update', (msg: CollabMessage) => {
      onNoteUpdate?.(msg);
    });

    socket.on('playback-sync', (msg: CollabMessage) => {
      onPlaybackSync?.(msg);
    });

    socket.on('cursor-move', (payload: CursorMovePayload) => {
      setState((s) => {
        const cursors = new Map(s.cursors);
        cursors.set(payload.user.id, payload);
        return { ...s, cursors };
      });
    });

    socket.on('chat-message', (payload: ChatMessagePayload) => {
      setState((s) => ({
        ...s,
        messages: [...s.messages.slice(-99), payload],
      }));
    });

    return () => {
      socket.emit('leave-room', { projectId, sessionId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, sessionId, user, onTrackUpdate, onNoteUpdate, onPlaybackSync]);

  const sendTrackUpdate = useCallback(
    (payload: TrackUpdatePayload) => {
      socketRef.current?.emit('track-update', {
        type: 'track-update',
        userId: user?.id,
        timestamp: Date.now(),
        payload,
      });
    },
    [user]
  );

  const sendCursorMove = useCallback(
    (beat: number, trackIndex: number) => {
      if (!collabUser.current) return;
      socketRef.current?.emit('cursor-move', {
        beat,
        trackIndex,
        user: collabUser.current,
      });
    },
    []
  );

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!collabUser.current) return;
      socketRef.current?.emit('chat-message', {
        text,
        user: collabUser.current,
      });
    },
    []
  );

  const sendPlaybackSync = useCallback(
    (isPlaying: boolean, beat: number, tempo: number) => {
      socketRef.current?.emit('playback-sync', {
        type: 'playback-sync',
        userId: user?.id,
        timestamp: Date.now(),
        payload: { isPlaying, beat, tempo },
      });
    },
    [user]
  );

  return {
    ...state,
    sendTrackUpdate,
    sendCursorMove,
    sendChatMessage,
    sendPlaybackSync,
  };
}
