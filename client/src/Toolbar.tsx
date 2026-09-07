import React from 'react';
import { Undo2, Redo2, Trash2 } from 'lucide-react';

interface ToolbarProps {
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  usersCount: number;
}

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
const WIDTHS = [2, 4, 6, 8, 12];

export const Toolbar: React.FC<ToolbarProps> = ({
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  onRedo,
  onClear,
  usersCount,
}) => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex items-center space-x-4">
      {/* Colors */}
      <div className="flex space-x-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-8 h-8 rounded-full border-2 ${
              color === c ? 'border-gray-900 scale-110' : 'border-transparent'
            } transition-transform`}
            style={{ backgroundColor: c }}
            title={`Color ${c}`}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-gray-200" />

      {/* Stroke Widths */}
      <div className="flex space-x-2 items-center">
        {WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 ${
              strokeWidth === w ? 'bg-gray-200' : ''
            }`}
            title={`Stroke Width ${w}`}
          >
            <div
              className="bg-gray-800 rounded-full"
              style={{ width: w, height: w }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-gray-200" />

      {/* Actions */}
      <div className="flex space-x-1">
        <button
          onClick={onUndo}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
          title="Undo"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={onRedo}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
          title="Redo"
        >
          <Redo2 size={20} />
        </button>
        <button
          onClick={onClear}
          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
          title="Clear Canvas"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="w-px h-8 bg-gray-200" />

      {/* Users count */}
      <div className="px-2 text-sm font-medium text-gray-600 flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>{usersCount} online</span>
      </div>
    </div>
  );
};
