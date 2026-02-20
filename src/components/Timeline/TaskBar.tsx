import React, { useCallback, useRef } from 'react';
import { Scissors } from 'lucide-react';
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
    updateTaskSplit,
    splitTask,
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
    splitId?: string;
  } | null>(null);

  const taskStart = parseISO(task.startDate);
  const taskEnd = parseISO(task.endDate);
  const left = dateToPixelOffset(taskStart, timelineStart, zoom);
  const right = dateToPixelOffset(taskEnd, timelineStart, zoom);
  const barWidth = Math.max(right - left, task.type === 'milestone' ? 0 : 20);
  const top = rowIndex * ROW_HEIGHT + 4;
  const barHeight = ROW_HEIGHT - 8;

  const handleDragStart = useCallback(
    (e: React.MouseEvent, mode: 'move' | 'resize-left' | 'resize-right', splitId?: string) => {
      e.stopPropagation();
      e.preventDefault();

      const origStart = splitId
        ? parseISO(task.splits.find((s) => s.id === splitId)!.startDate)
        : taskStart;
      const origEnd = splitId
        ? parseISO(task.splits.find((s) => s.id === splitId)!.endDate)
        : taskEnd;

      dragRef.current = {
        mode,
        startX: e.clientX,
        origStart,
        origEnd,
        splitId,
      };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = me.clientX - dragRef.current.startX;
        const { mode: m, origStart: os, origEnd: oe, splitId: sid } = dragRef.current;

        if (sid) {
          // Dragging a split segment
          if (m === 'move') {
            const newStart = pixelOffsetToDate(
              dateToPixelOffset(os, timelineStart, zoom) + dx,
              timelineStart,
              zoom
            );
            const duration = differenceInCalendarDays(oe, os);
            const newEnd = addDays(newStart, duration);
            updateTaskSplit(task.id, sid, {
              startDate: toISODate(newStart),
              endDate: toISODate(newEnd),
            });
          } else if (m === 'resize-left') {
            const newStart = pixelOffsetToDate(
              dateToPixelOffset(os, timelineStart, zoom) + dx,
              timelineStart,
              zoom
            );
            if (newStart < oe) {
              updateTaskSplit(task.id, sid, { startDate: toISODate(newStart) });
            }
          } else if (m === 'resize-right') {
            const newEnd = pixelOffsetToDate(
              dateToPixelOffset(oe, timelineStart, zoom) + dx,
              timelineStart,
              zoom
            );
            if (newEnd > os) {
              updateTaskSplit(task.id, sid, { endDate: toISODate(newEnd) });
            }
          }
        } else {
          // Dragging the whole task (unsplit)
          if (m === 'move') {
            const newStart = pixelOffsetToDate(
              dateToPixelOffset(os, timelineStart, zoom) + dx,
              timelineStart,
              zoom
            );
            const duration = differenceInCalendarDays(oe, os);
            const newEnd = addDays(newStart, duration);
            updateTask(task.id, {
              startDate: toISODate(newStart),
              endDate: toISODate(newEnd),
            });
          } else if (m === 'resize-left') {
            const newStart = pixelOffsetToDate(
              dateToPixelOffset(os, timelineStart, zoom) + dx,
              timelineStart,
              zoom
            );
            if (newStart < oe) {
              updateTask(task.id, { startDate: toISODate(newStart) });
            }
          } else if (m === 'resize-right') {
            const newEnd = pixelOffsetToDate(
              dateToPixelOffset(oe, timelineStart, zoom) + dx,
              timelineStart,
              zoom
            );
            if (newEnd > os) {
              updateTask(task.id, { endDate: toISODate(newEnd) });
            }
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
    [task.id, task.splits, taskStart, taskEnd, timelineStart, zoom, updateTask, updateTaskSplit]
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

  // ---- Split task rendering ----
  if (task.splits && task.splits.length > 0) {
    return (
      <g
        onMouseEnter={() => setHoveredTask(task.id)}
        onMouseLeave={() => setHoveredTask(null)}
        className="cursor-pointer"
      >
        {task.splits.map((split) => {
          const sStart = parseISO(split.startDate);
          const sEnd = parseISO(split.endDate);
          const sLeft = dateToPixelOffset(sStart, timelineStart, zoom);
          const sRight = dateToPixelOffset(sEnd, timelineStart, zoom);
          const sWidth = Math.max(sRight - sLeft, 20);
          const progressWidth = (sWidth * task.percentComplete) / 100;

          return (
            <g key={split.id}>
              {/* Split segment background */}
              <rect
                x={sLeft}
                y={top}
                width={sWidth}
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
                  x={sLeft}
                  y={top}
                  width={progressWidth}
                  height={barHeight}
                  rx={4}
                  fill={task.color}
                  opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Split segment label */}
              <text
                x={sLeft + 6}
                y={top + barHeight / 2 + 4}
                className="text-[11px] font-medium"
                fill={isDark ? '#f3f4f6' : '#1f2937'}
                style={{ pointerEvents: 'none' }}
              >
                {sWidth > 60 ? task.title : ''}
              </text>

              {/* Drag handle: move */}
              <rect
                x={sLeft + 6}
                y={top}
                width={Math.max(sWidth - 12, 8)}
                height={barHeight}
                fill="transparent"
                className="cursor-grab"
                onMouseDown={(e) => handleDragStart(e, 'move', split.id)}
                onClick={handleClick}
                onDoubleClick={() => openTaskDetails(task.id)}
              />

              {/* Resize handle: left */}
              <rect
                x={sLeft}
                y={top}
                width={6}
                height={barHeight}
                fill="transparent"
                className="cursor-col-resize"
                onMouseDown={(e) => handleDragStart(e, 'resize-left', split.id)}
              />

              {/* Resize handle: right */}
              <rect
                x={sLeft + sWidth - 6}
                y={top}
                width={6}
                height={barHeight}
                fill="transparent"
                className="cursor-col-resize"
                onMouseDown={(e) => handleDragStart(e, 'resize-right', split.id)}
              />
            </g>
          );
        })}

        {/* Dashed connector line between split segments */}
        {task.splits.length >= 2 && (() => {
          const sorted = [...task.splits].sort((a, b) => a.startDate.localeCompare(b.startDate));
          const lines: React.ReactNode[] = [];
          for (let i = 0; i < sorted.length - 1; i++) {
            const endOfFirst = dateToPixelOffset(parseISO(sorted[i].endDate), timelineStart, zoom);
            const startOfSecond = dateToPixelOffset(parseISO(sorted[i + 1].startDate), timelineStart, zoom);
            const cy = top + barHeight / 2;
            lines.push(
              <line
                key={`conn-${i}`}
                x1={endOfFirst}
                y1={cy}
                x2={startOfSecond}
                y2={cy}
                stroke={task.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.5}
                style={{ pointerEvents: 'none' }}
              />
            );
          }
          return lines;
        })()}
      </g>
    );
  }

  // ---- Regular (unsplit) task bar ----
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

      {/* Split button - appears when task is selected and not yet split */}
      {isSelected && task.splits.length === 0 && task.duration >= 3 && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            splitTask(task.id);
          }}
          className="cursor-pointer"
        >
          <rect
            x={left + barWidth / 2 - 12}
            y={top - 22}
            width={24}
            height={20}
            rx={4}
            fill={isDark ? '#374151' : '#ffffff'}
            stroke={isDark ? '#6b7280' : '#d1d5db'}
            strokeWidth={1}
          />
          <foreignObject
            x={left + barWidth / 2 - 12}
            y={top - 22}
            width={24}
            height={20}
          >
            <div
              title="Split task"
              style={{
                width: 24,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scissors style={{ width: 14, height: 14, color: isDark ? '#9ca3af' : '#6b7280' }} />
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}
