import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { StickyNote, Task, ZoomLevel } from '../../types';
import { STICKY_NOTE_COLORS } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { parseISO, dateToPixelOffset, ROW_HEIGHT } from '../../utils/dates';
import { X, Palette } from 'lucide-react';

interface StickyNoteLayerProps {
  visibleTasks: Task[];
  timelineStart: Date;
  zoom: ZoomLevel;
  totalWidth: number;
  totalHeight: number;
}

const NOTE_WIDTH = 150;
const NOTE_MIN_HEIGHT = 60;

/** Calculate the center point of a task bar on the grid */
function getTaskBarCenter(
  task: Task,
  rowIndex: number,
  timelineStart: Date,
  zoom: ZoomLevel
): { x: number; y: number } {
  const startPx = dateToPixelOffset(parseISO(task.startDate), timelineStart, zoom);
  const endPx = dateToPixelOffset(parseISO(task.endDate), timelineStart, zoom);
  return {
    x: (startPx + endPx) / 2,
    y: rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
  };
}

function StickyNoteCard({
  note,
  taskCenter,
}: {
  note: StickyNote;
  taskCenter: { x: number; y: number };
}) {
  const { updateStickyNote, deleteStickyNote } = useProjectStore();
  const [editing, setEditing] = useState(!note.text);
  const [text, setText] = useState(note.text);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origOX: number; origOY: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const noteX = taskCenter.x + note.offsetX;
  const noteY = taskCenter.y + note.offsetY;

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag if clicking buttons or textarea
      if ((e.target as HTMLElement).closest('button, textarea')) return;
      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origOX: note.offsetX,
        origOY: note.offsetY,
      };

      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = me.clientX - dragRef.current.startX;
        const dy = me.clientY - dragRef.current.startY;
        updateStickyNote(note.id, {
          offsetX: dragRef.current.origOX + dx,
          offsetY: dragRef.current.origOY + dy,
        });
      };

      const handleUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.body.style.cursor = '';
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      document.body.style.cursor = 'grabbing';
    },
    [note.id, note.offsetX, note.offsetY, updateStickyNote]
  );

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (text !== note.text) {
      updateStickyNote(note.id, { text });
    }
  }, [note.id, note.text, text, updateStickyNote]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(false);
        setText(note.text);
      }
    },
    [note.text]
  );

  return (
    <div
      ref={cardRef}
      className="absolute select-none"
      style={{
        left: noteX,
        top: noteY,
        width: NOTE_WIDTH,
        minHeight: NOTE_MIN_HEIGHT,
        zIndex: 20,
      }}
      onMouseDown={handleDragStart}
    >
      {/* The sticky note card */}
      <div
        className="rounded-md shadow-lg border border-black/10 cursor-grab"
        style={{ backgroundColor: note.color }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-black/10">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
              className="p-0.5 rounded hover:bg-black/10 transition-colors"
              title="Change color"
            >
              <Palette className="w-3 h-3 text-gray-700" />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 flex gap-1 bg-white rounded shadow-lg p-1.5 z-30 border border-gray-200">
                {Object.entries(STICKY_NOTE_COLORS).map(([name, color]) => (
                  <button
                    key={name}
                    className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={name}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStickyNote(note.id, { color });
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); deleteStickyNote(note.id); }}
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            title="Delete note"
          >
            <X className="w-3 h-3 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-2" onDoubleClick={() => setEditing(true)}>
          {editing ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs text-gray-800 resize-none outline-none placeholder-gray-500"
              style={{ minHeight: 36 }}
              placeholder="Type note..."
              rows={3}
            />
          ) : (
            <p className="text-xs text-gray-800 whitespace-pre-wrap min-h-[36px] cursor-text">
              {note.text || <span className="text-gray-500 italic">Double-click to edit...</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StickyNoteLayer({
  visibleTasks,
  timelineStart,
  zoom,
  totalWidth,
  totalHeight,
}: StickyNoteLayerProps) {
  const { stickyNotes } = useProjectStore();

  // Build a map of taskId -> rowIndex for visible tasks
  const taskRowMap = new Map<string, number>();
  visibleTasks.forEach((t, i) => taskRowMap.set(t.id, i));

  const taskMap = new Map<string, Task>();
  visibleTasks.forEach((t) => taskMap.set(t.id, t));

  // Only show notes for tasks that are visible
  const visibleNotes = stickyNotes.filter((n) => taskRowMap.has(n.taskId));

  return (
    <>
      {/* Arrow lines (SVG layer) */}
      <svg
        width={totalWidth}
        height={totalHeight}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 15 }}
      >
        {visibleNotes.map((note) => {
          const task = taskMap.get(note.taskId)!;
          const rowIdx = taskRowMap.get(note.taskId)!;
          const center = getTaskBarCenter(task, rowIdx, timelineStart, zoom);

          // Note anchor: bottom-center of note when above, top-center when below
          const noteX = center.x + note.offsetX + NOTE_WIDTH / 2;
          const noteY = center.y + note.offsetY;
          const isAbove = noteY < center.y;
          const noteAnchorY = isAbove ? noteY + NOTE_MIN_HEIGHT : noteY;

          return (
            <line
              key={note.id}
              x1={noteX}
              y1={noteAnchorY}
              x2={center.x}
              y2={center.y}
              stroke={note.color === '#fef08a' ? '#ca8a04' : '#6b7280'}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              markerEnd="url(#note-arrow)"
            />
          );
        })}
        <defs>
          <marker
            id="note-arrow"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
        </defs>
      </svg>

      {/* Note cards (HTML layer) */}
      {visibleNotes.map((note) => {
        const task = taskMap.get(note.taskId)!;
        const rowIdx = taskRowMap.get(note.taskId)!;
        const center = getTaskBarCenter(task, rowIdx, timelineStart, zoom);

        return (
          <StickyNoteCard
            key={note.id}
            note={note}
            taskCenter={center}
          />
        );
      })}
    </>
  );
}
