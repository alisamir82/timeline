import React, { useRef, useMemo } from 'react';
import type { ZoomLevel, Task } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import {
  parseISO,
  addDays,
  getTimelineUnits,
  COLUMN_WIDTHS,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  isWeekend,
  dateToPixelOffset,
} from '../../utils/dates';
import TimelineHeader from './TimelineHeader';
import TaskBar from './TaskBar';
import DependencyLines from './DependencyLines';
import TodayLine from './TodayLine';
import StickyNoteLayer from './StickyNoteLayer';

interface TimelineGridProps {
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
}

export default function TimelineGrid({ scrollTop, onScroll }: TimelineGridProps) {
  const { project, zoom, getVisibleTasks, addNoteMode, setAddNoteMode } = useProjectStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleTasks = getVisibleTasks();

  // Escape key cancels add-note mode
  React.useEffect(() => {
    if (!addNoteMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddNoteMode(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [addNoteMode, setAddNoteMode]);

  const timelineStart = useMemo(() => addDays(parseISO(project.startDate), -7), [project.startDate]);
  const timelineEnd = useMemo(() => addDays(parseISO(project.endDate), 14), [project.endDate]);

  const units = getTimelineUnits(timelineStart, timelineEnd, zoom);
  const colWidth = COLUMN_WIDTHS[zoom];
  const totalWidth = units.length * colWidth;
  const totalHeight = visibleTasks.length * ROW_HEIGHT;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900 ${addNoteMode ? 'cursor-crosshair' : ''}`}>
      {/* Add-note mode hint */}
      {addNoteMode && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <span>Click on a task bar to add a sticky note</span>
          <button
            onClick={() => setAddNoteMode(false)}
            className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 transition-colors"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Sticky timeline header */}
      <TimelineHeader
        startDate={timelineStart}
        endDate={timelineEnd}
        zoom={zoom}
        scrollLeft={0}
      />

      {/* Scrollable body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => {
          const el = e.target as HTMLElement;
          onScroll(el.scrollTop);
        }}
      >
        <div style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
          {/* Background grid lines */}
          <svg
            width={totalWidth}
            height={totalHeight}
            className="absolute top-0 left-0"
            style={{ pointerEvents: 'none' }}
          >
            {/* Vertical grid lines + weekend shading */}
            {units.map((unit, i) => {
              const x = i * colWidth;
              const weekend = zoom === 'day' && isWeekend(unit);
              return (
                <g key={i}>
                  {weekend && (
                    <rect x={x} y={0} width={colWidth} height={totalHeight} fill="#f9fafb" />
                  )}
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={totalHeight}
                    stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {/* Horizontal row lines */}
            {visibleTasks.map((_, i) => (
              <line
                key={i}
                x1={0}
                y1={(i + 1) * ROW_HEIGHT}
                x2={totalWidth}
                y2={(i + 1) * ROW_HEIGHT}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
            ))}
          </svg>

          {/* Task bars and dependency lines */}
          <svg
            width={totalWidth}
            height={totalHeight}
            className="absolute top-0 left-0"
          >
            {/* Arrow marker definitions */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={6}
                markerHeight={6}
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={6}
                markerHeight={6}
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Dependency connector lines */}
            <DependencyLines
              visibleTasks={visibleTasks}
              timelineStart={timelineStart}
              zoom={zoom}
            />

            {/* Task bars */}
            {visibleTasks.map((task, i) => (
              <TaskBar
                key={task.id}
                task={task}
                rowIndex={i}
                timelineStart={timelineStart}
                zoom={zoom}
              />
            ))}

            {/* Today line */}
            <TodayLine
              timelineStart={timelineStart}
              zoom={zoom}
              height={totalHeight}
            />
          </svg>

          {/* Sticky notes layer */}
          <StickyNoteLayer
            visibleTasks={visibleTasks}
            timelineStart={timelineStart}
            zoom={zoom}
            totalWidth={totalWidth}
            totalHeight={totalHeight}
          />
        </div>
      </div>
    </div>
  );
}
