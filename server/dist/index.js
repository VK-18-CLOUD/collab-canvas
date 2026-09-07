"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const Y = __importStar(require("yjs"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
// Allow any origin for the sake of the assignment, in production configure properly
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
// In-memory store for Yjs documents per room
const docs = new Map();
io.on('connection', (socket) => {
    // Get room ID from query string, default to 'default'
    const room = socket.handshake.query.room || 'default';
    socket.join(room);
    console.log(`Client ${socket.id} joined room ${room}`);
    // Create document for the room if it doesn't exist
    if (!docs.has(room)) {
        docs.set(room, new Y.Doc());
    }
    const doc = docs.get(room);
    // 1. Send the current document state to the newly connected client
    // encodeStateAsUpdate without a state vector sends the full document
    const stateAsUpdate = Y.encodeStateAsUpdate(doc);
    socket.emit('sync-update', stateAsUpdate);
    // 2. Listen for Yjs sync updates from the client
    socket.on('sync-update', (updateBuffer) => {
        // We receive the update as an ArrayBuffer, convert to Uint8Array for Yjs
        const update = new Uint8Array(updateBuffer);
        // Apply the update to our server-side document
        Y.applyUpdate(doc, update);
        // Broadcast the update to all OTHER clients in the room
        socket.to(room).emit('sync-update', updateBuffer);
    });
    // 3. Listen for Yjs awareness updates (cursor positions, user info)
    socket.on('awareness-update', (updateBuffer) => {
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
