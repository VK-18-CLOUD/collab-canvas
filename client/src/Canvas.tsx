import React, { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import { Awareness } from 'y-protocols/awareness';

interface CanvasProps {
  ydoc: Y.Doc;
  awareness: Awareness;
  color: string;
  strokeWidth: number;
}

export const Canvas: React.FC<CanvasProps> = ({ ydoc, awareness, color, strokeWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Local state for the current stroke being drawn
  const isDrawing = useRef(false);
  const currentStroke = useRef<Y.Map<any> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const strokes = ydoc.getArray<Y.Map<any>>('strokes');

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all strokes
      strokes.forEach((strokeMap) => {
        const pointsArray = strokeMap.get('points') as Y.Array<any>;
        if (!pointsArray) return;
        const points = pointsArray.toArray();
        if (points.length === 0) return;

        ctx.beginPath();
        ctx.strokeStyle = strokeMap.get('color') || '#000000';
        ctx.lineWidth = strokeMap.get('width') || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      });

      // Draw cursors
      const states = awareness.getStates();
      states.forEach((state: any, clientId: number) => {
        if (clientId === awareness.clientID) return; // Don't draw our own cursor
        if (state.cursor) {
          ctx.beginPath();
          ctx.fillStyle = state.color || '#ff0000';
          ctx.arc(state.cursor.x, state.cursor.y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Draw user name / ID
          ctx.font = '12px sans-serif';
          ctx.fillText(state.name || 'Anonymous', state.cursor.x + 10, state.cursor.y + 10);
        }
      });
    };

    // Resize canvas to fill container
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };
    window.addEventListener('resize', resize);
    resize(); // Initial sizing

    // Redraw whenever the document or awareness changes
    const observer = () => {
      requestAnimationFrame(draw);
    };
    strokes.observeDeep(observer);
    awareness.on('change', observer);

    // Initial draw
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      strokes.unobserveDeep(observer);
      awareness.off('change', observer);
    };
  }, [ydoc, awareness]);

  // Handle pointer events
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stroke = new Y.Map<any>();
    stroke.set('id', uuidv4());
    stroke.set('color', color);
    stroke.set('width', strokeWidth);
    
    const points = new Y.Array<any>();
    points.push([{ x, y }]);
    stroke.set('points', points);

    currentStroke.current = stroke;

    const strokes = ydoc.getArray<Y.Map<any>>('strokes');
    strokes.push([stroke]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update awareness (cursor position)
    awareness.setLocalStateField('cursor', { x, y });

    if (!isDrawing.current || !currentStroke.current) return;

    const points = currentStroke.current.get('points') as Y.Array<any>;
    if (points) {
      points.push([{ x, y }]);
    }
  };

  const onPointerUp = () => {
    isDrawing.current = false;
    currentStroke.current = null;
  };

  const onPointerLeave = () => {
    isDrawing.current = false;
    currentStroke.current = null;
    awareness.setLocalStateField('cursor', null);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className="touch-none w-full h-full block cursor-crosshair"
    />
  );
};
