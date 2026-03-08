// Custom Next.js server with Socket.io for real-time collaboration
// Run with: node server.ts (or ts-node server.ts, or compiled)

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import type {
  CollabUser,
  JoinRoomPayload,
  CursorMovePayload,
  ChatMessagePayload,
} from './src/lib/collab/protocol';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface RoomUser extends CollabUser {
  socketId: string;
}

// In-memory room state
const rooms = new Map<string, Map<string, RoomUser>>();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer(httpServer, {
    path: '/api/socket',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    let currentRoom: string | null = null;
    let currentUser: RoomUser | null = null;

    socket.on('join-room', (payload: JoinRoomPayload) => {
      const { projectId, user } = payload;
      const roomId = projectId;
      currentRoom = roomId;
      currentUser = { ...user, socketId: socket.id };

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      rooms.get(roomId)!.set(user.id, currentUser);

      const users = Array.from(rooms.get(roomId)!.values());

      // Notify room
      io.to(roomId).emit('user-joined', { user: currentUser, users });
      console.log(`[Collab] ${user.name} joined room ${roomId} (${users.length} users)`);
    });

    socket.on('leave-room', () => {
      handleLeave();
    });

    socket.on('disconnect', () => {
      handleLeave();
    });

    function handleLeave() {
      if (!currentRoom || !currentUser) return;
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(currentUser.id);
        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
        const users = Array.from(room.values());
        io.to(currentRoom).emit('user-left', {
          userId: currentUser!.id,
          users,
        });
        console.log(`[Collab] ${currentUser!.name} left room ${currentRoom}`);
      }
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }

    // Track updates (last-write-wins broadcast)
    socket.on('track-update', (msg) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('track-update', msg.payload || msg);
    });

    socket.on('note-update', (msg) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('note-update', msg);
    });

    socket.on('clip-update', (msg) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('clip-update', msg);
    });

    socket.on('cursor-move', (payload: CursorMovePayload) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('cursor-move', payload);
    });

    socket.on('chat-message', (payload: ChatMessagePayload) => {
      if (!currentRoom) return;
      io.to(currentRoom).emit('chat-message', payload);
    });

    socket.on('playback-sync', (msg) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('playback-sync', msg);
    });

    // Project metadata (name, tempo, etc.)
    socket.on('project-meta-update', (msg) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('project-meta-update', msg);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io collab server running on /api/socket`);
  });
});
