import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as Y from 'yjs';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);

// Allow any origin for the sake of the assignment, in production configure properly
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory store for Yjs documents per room
const docs: Map<string, Y.Doc> = new Map();

io.on('connection', (socket) => {
  // Get room ID from query string, default to 'default'
  const room = (socket.handshake.query.room as string) || 'default';
  socket.join(room);

  console.log(`Client ${socket.id} joined room ${room}`);

  // Create document for the room if it doesn't exist
  if (!docs.has(room)) {
    docs.set(room, new Y.Doc());
  }
  const doc = docs.get(room)!;

  // 1. Send the current document state to the newly connected client
  // encodeStateAsUpdate without a state vector sends the full document
  const stateAsUpdate = Y.encodeStateAsUpdate(doc);
  socket.emit('sync-update', stateAsUpdate);

  // 2. Listen for Yjs sync updates from the client
  socket.on('sync-update', (updateBuffer: ArrayBuffer) => {
    // We receive the update as an ArrayBuffer, convert to Uint8Array for Yjs
    const update = new Uint8Array(updateBuffer);
    
    // Apply the update to our server-side document
    Y.applyUpdate(doc, update);
    
    // Broadcast the update to all OTHER clients in the room
    socket.to(room).emit('sync-update', updateBuffer);
  });

  // 3. Listen for Yjs awareness updates (cursor positions, user info)
  socket.on('awareness-update', (updateBuffer: ArrayBuffer) => {
    // Just blindly forward awareness updates to other clients in the room
    // Awareness doesn't need to be applied to the Y.Doc on the server
    socket.to(room).emit('awareness-update', updateBuffer);
  });

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected from room ${room}`);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
