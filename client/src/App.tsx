import { useEffect, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { io } from 'socket.io-client';
import { SocketIOProvider } from './yjs-socket';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';

// Simple hash for random color based on client ID
const generateColor = (id: number) => {
  const colors = ['#ef4444', '#f97316', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'];
  return colors[id % colors.length];
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [usersCount, setUsersCount] = useState(1);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Setup Yjs and Socket.io
  const { ydoc, provider, undoManager } = useMemo(() => {
    const ydoc = new Y.Doc();
    
    const strokes = ydoc.getArray<Y.Map<any>>('strokes');
    const undoManager = new Y.UndoManager(strokes);

    // Get room from URL or default
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room') || 'default';

    // The backend URL injected by Vite environment variables
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    
    const socket = io(serverUrl, {
      query: { room },
    });

    const provider = new SocketIOProvider(socket, ydoc);

    return { ydoc, provider, undoManager };
  }, []);

  useEffect(() => {
    const { socket, awareness } = provider;

    socket.on('connect', () => {
      setIsConnected(true);
      // Set our own user info
      awareness.setLocalStateField('name', `User ${Math.floor(Math.random() * 1000)}`);
      awareness.setLocalStateField('color', generateColor(awareness.clientID));
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Track online users
    const onAwarenessChange = () => {
      setUsersCount(awareness.getStates().size);
    };
    awareness.on('change', onAwarenessChange);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      awareness.off('change', onAwarenessChange);
      provider.destroy();
      socket.disconnect();
    };
  }, [provider]);

  const handleClear = () => {
    const strokes = ydoc.getArray('strokes');
    strokes.delete(0, strokes.length);
  };

  const handleUndo = () => undoManager.undo();
  const handleRedo = () => undoManager.redo();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {!isConnected && (
        <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded shadow text-sm font-medium z-50">
          Connecting to server...
        </div>
      )}

      <Canvas 
        ydoc={ydoc}
        awareness={provider.awareness}
        color={color}
        strokeWidth={strokeWidth}
      />

      <Toolbar 
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        usersCount={usersCount}
      />
    </div>
  );
}

export default App;
