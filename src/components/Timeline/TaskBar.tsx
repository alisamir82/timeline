import React, { useCallback, useRef } from 'react';
import type { Task, ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import type { ThemeMode } from '../../types';
import {
  parseISO,
  dateToPixelOffset,
  pixelOffsetToDate,
  toISODate,
  addDays,
  differenceInCalendarDays,
  ROW_HEIGHT,
} from '../../utils/dates';

interface TaskBarProps {
  task: Task;
  rowIndex: number;
  timelineStart: Date;
  zoom: ZoomLevel;
}

export default function TaskBar({ task, rowIndex, timelineStart, zoom }: TaskBarProps) {
  const {
    selectedTaskId,
    hoveredTaskId,
    setHoveredTask,
    openTaskDetails,
    selectTask,
    updateTask,
    setDragState,
    dragState,
    addNoteMode,
    addStickyNote,
    theme,
  } = useProjectStore();
  const isDark = theme === 'dark';

  const isSelected = selectedTaskId === task.id;
  const isHovered = hoveredTaskId === task.id;

  const handleClick = useCallback(() => {
    if (addNoteMode) {
      addStickyNote(task.id);
    } else {
      selectTask(task.id);
    }
  }, [addNoteMode, addStickyNote, selectTask, task.id]);
  const dragRef = useRef<{
    mode: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);

  const taskStart = parseISO(task.startDate);
  const taskEnd = parseISO(task.endDate);
  const left = dateToPixelOffset(taskStart, timelineStart, zoom);
  const right = dateToPixelOffset(taskEnd, timelineStart, zoom);
  const barWidth = Math.max(right - left, task.type === 'milestone' ? 0 : 20);
  const top = rowIndex * ROW_HEIGHT + 4;
  const barHeight = ROW_HEIGHT - 8;

  const handleDragStart = useCallback(
    (e: React.MouseEvent, mode: 'move' | 'resize-left' | 'resize-right') => {
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        mode,
        startX: e.clientX,
        origStart: taskStart,
        origEnd: taskEnd,
      };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = me.clientX - dragRef.current.startX;
        const { mode: m, origStart, origEnd } = dragRef.current;

        if (m === 'move') {
          const newStart = pixelOffsetToDate(
            dateToPixelOffset(origStart, timelineStart, zoom) + dx,
            timelineStart,
            zoom
          );
          const duration = differenceInCalendarDays(origEnd, origStart);
          const newEnd = addDays(newStart, duration);
          updateTask(task.id, {
            startDate: toISODate(newStart),
            endDate: toISODate(newEnd),
          });
        } else if (m === 'resize-left') {
          const newStart = pixelOffsetToDate(
            dateToPixelOffset(origStart, timelineStart, zoom) + dx,
            timelineStart,
            zoom
          );
          if (newStart < origEnd) {
            updateTask(task.id, { startDate: toISODate(newStart) });
          }
        } else if (m === 'resize-right') {
          const newEnd = pixelOffsetToDate(
            dateToPixelOffset(origEnd, timelineStart, zoom) + dx,
            timelineStart,
            zoom
          );
          if (newEnd > origStart) {
            updateTask(task.id, { endDate: toISODate(newEnd) });
          }
        }
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = mode === 'move' ? 'grabbing' : 'col-resize';
    },
    [task.id, taskStart, taskEnd, timelineStart, zoom, updateTask]
  );

  // Milestone rendering
  if (task.type === 'milestone') {
    const cx = left;
    const cy = top + barHeight / 2;
    const size = 10;
    return (
      <g
        onClick={handleClick}
        onDoubleClick={() => openTaskDetails(task.id)}
        onMouseEnter={() => setHoveredTask(task.id)}
        onMouseLeave={() => setHoveredTask(null)}
        className="cursor-pointer"
      >
        <polygon
          points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
          fill={task.color}
          stroke={isSelected ? '#2563eb' : isHovered ? '#60a5fa' : 'none'}
          strokeWidth={isSelected || isHovered ? 2 : 0}
        />
        <text
          x={cx + size + 4}
          y={cy + 4}
          className="text-[11px]"
          fill={isDark ? '#e5e7eb' : '#4b5563'}
          style={{ pointerEvents: 'none' }}
        >
          {task.title}
        </text>
      </g>
    );
  }

  // Summary bar rendering
  if (task.type === 'summary') {
    return (
      <g
        onClick={handleClick}
        onDoubleClick={() => openTaskDetails(task.id)}
        onMouseEnter={() => setHoveredTask(task.id)}
        onMouseLeave={() => setHoveredTask(null)}
        className="cursor-pointer"
      >
        {/* Summary bar - thinner with pointed ends */}
        <rect
          x={left}
          y={top + barHeight / 2 - 4}
          width={barWidth}
          height={8}
          rx={1}
          fill={task.color}
          opacity={0.7}
          stroke={isSelected ? '#2563eb' : 'none'}
          strokeWidth={isSelected ? 2 : 0}
        />
        {/* Left bracket */}
        <polygon
          points={`${left},${top + barHeight / 2 - 6} ${left + 5},${top + barHeight / 2 - 6} ${left},${top + barHeight / 2 + 6}`}
          fill={task.color}
          opacity={0.9}
        />
        {/* Right bracket */}
        <polygon
          points={`${left + barWidth},${top + barHeight / 2 - 6} ${left + barWidth - 5},${top + barHeight / 2 - 6} ${left + barWidth},${top + barHeight / 2 + 6}`}
          fill={task.color}
          opacity={0.9}
        />
      </g>
    );
  }

  // Regular task bar
  const progressWidth = (barWidth * task.percentComplete) / 100;

  return (
    <g
      onMouseEnter={() => setHoveredTask(task.id)}
      onMouseLeave={() => setHoveredTask(null)}
      className="cursor-pointer"
    >
      {/* Task bar background */}
      <rect
        x={left}
        y={top}
        width={barWidth}
        height={barHeight}
        rx={4}
        fill={task.color}
        opacity={0.2}
        stroke={isSelected ? '#2563eb' : isHovered ? '#93c5fd' : 'transparent'}
        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
        onClick={handleClick}
        onDoubleClick={() => openTaskDetails(task.id)}
      />

      {/* Progress fill */}
      {task.percentComplete > 0 && (
        <rect
          x={left}
          y={top}
          width={progressWidth}
          height={barHeight}
          rx={4}
          fill={task.color}
          opacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Task label inside bar */}
      <text
        x={left + 6}
        y={top + barHeight / 2 + 4}
        className="text-[11px] font-medium"
        fill={isDark ? '#f3f4f6' : '#1f2937'}
        style={{ pointerEvents: 'none' }}
        clipPath={`inset(0 0 0 0)`}
      >
        {barWidth > 60 ? task.title : ''}
      </text>

      {/* Drag handle: move (center area) */}
      <rect
        x={left + 6}
        y={top}
        width={Math.max(barWidth - 12, 8)}
        height={barHeight}
        fill="transparent"
        className="cursor-grab"
        onMouseDown={(e) => handleDragStart(e, 'move')}
        onClick={handleClick}
        onDoubleClick={() => openTaskDetails(task.id)}
      />

      {/* Resize handle: left */}
      <rect
        x={left}
        y={top}
        width={6}
        height={barHeight}
        fill="transparent"
        className="cursor-col-resize"
        onMouseDown={(e) => handleDragStart(e, 'resize-left')}
      />

      {/* Resize handle: right */}
      <rect
        x={left + barWidth - 6}
        y={top}
        width={6}
        height={barHeight}
        fill="transparent"
        className="cursor-col-resize"
        onMouseDown={(e) => handleDragStart(e, 'resize-right')}
      />
    </g>
  );
}
