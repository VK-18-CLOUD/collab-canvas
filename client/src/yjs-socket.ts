import * as Y from 'yjs';
import { Socket } from 'socket.io-client';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';

/**
 * A simple sync provider that bridges Yjs and Socket.IO.
 * It also includes Awareness (for cursors).
 */
export class SocketIOProvider {
  public awareness: Awareness;
  public socket: Socket;
  public doc: Y.Doc;
  private updateHandler: (update: Uint8Array, origin: any) => void;
  private awarenessUpdateHandler: (changes: any, origin: any) => void;

  constructor(socket: Socket, doc: Y.Doc) {
    this.socket = socket;
    this.doc = doc;
    this.awareness = new Awareness(doc);

    // 1. Listen for document updates from Yjs and send to server
    this.updateHandler = (update: Uint8Array, origin: any) => {
      // Don't send updates that we just received from the server
      if (origin !== this) {
        socket.emit('sync-update', update.buffer);
      }
    };
    doc.on('update', this.updateHandler);

    // 2. Listen for document updates from server and apply to Yjs
    socket.on('sync-update', (updateBuffer: ArrayBuffer) => {
      const update = new Uint8Array(updateBuffer);
      Y.applyUpdate(doc, update, this);
    });

    // 3. Listen for awareness updates from Yjs and send to server
    this.awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
      if (origin !== this) {
        const changedClients = added.concat(updated).concat(removed);
        const update = encodeAwarenessUpdate(
          this.awareness,
          changedClients
        );
        this.socket.emit('awareness-update', update.buffer);
      }
    };
    this.awareness.on('update', this.awarenessUpdateHandler);

    // 4. Listen for awareness updates from server and apply to Yjs
    this.socket.on('awareness-update', (updateBuffer: ArrayBuffer) => {
      const update = new Uint8Array(updateBuffer);
      applyAwarenessUpdate(this.awareness, update, this);
    });
  }

  destroy() {
    this.doc.off('update', this.updateHandler);
    this.awareness.off('update', this.awarenessUpdateHandler);
    this.awareness.destroy();
    this.socket.off('sync-update');
    this.socket.off('awareness-update');
  }
}
