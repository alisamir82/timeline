import React, { useRef, useMemo, useEffect } from 'react';
import type { ZoomLevel, Task } from '../../types';
import { CORPORATE_COLORS } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import {
  parseISO,
  addDays,
  getTimelineUnits,
  COLUMN_WIDTHS,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  COLUMN_HEADER_HEIGHT,
  isWeekend,
  dateToPixelOffset,
} from '../../utils/dates';
import TimelineHeader from './TimelineHeader';
import TaskBar from './TaskBar';
import DependencyLines from './DependencyLines';
import TodayLine from './TodayLine';
import StickyNoteLayer from './StickyNoteLayer';

const QUALITY_GATE_BAR_HEIGHT = 48; // height when quality gates exist

interface TimelineGridProps {
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
}

export default function TimelineGrid({ scrollTop, onScroll }: TimelineGridProps) {
  const { project, zoom, getVisibleTasks, getQualityGates, addNoteMode, setAddNoteMode, theme, openTaskDetails } = useProjectStore();
  const isDark = theme === 'dark';
  const isCorp = theme === 'corporate';
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingSelf = useRef(false);
  const visibleTasks = getVisibleTasks();
  const qualityGates = getQualityGates();
  const gateBarHeight = qualityGates.length > 0 ? QUALITY_GATE_BAR_HEIGHT : COLUMN_HEADER_HEIGHT;

  // Sync scroll position from left panel
  useEffect(() => {
    if (containerRef.current && !isScrollingSelf.current) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

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
    <div className={`flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900 ${addNoteMode ? 'cursor-crosshair' : ''}`} style={isCorp ? { backgroundColor: '#ffffff' } : undefined}>
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

      {/* Quality gate bar / column header spacer */}
      <div
        className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative overflow-hidden"
        style={{ height: gateBarHeight, ...(isCorp ? { backgroundColor: CORPORATE_COLORS.barBg, borderColor: CORPORATE_COLORS.barBorder } : {}) }}
      >
        {/* Quality gate stars positioned by date */}
        {qualityGates.map((gate) => {
          const x = dateToPixelOffset(parseISO(gate.startDate), timelineStart, zoom);
          return (
            <div
              key={gate.id}
              className="absolute flex flex-col items-center cursor-pointer group"
              style={{ left: x - 12, top: 2, width: 24 }}
              onClick={() => openTaskDetails(gate.id)}
              title={`${gate.title} - ${gate.startDate}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={gate.color || '#f59e0b'}
                  stroke={isCorp || isDark ? '#ffffff' : '#374151'}
                  strokeWidth="0.5"
                />
              </svg>
              <span
                className="text-[8px] font-medium leading-tight text-center truncate max-w-[48px]"
                style={{ color: isCorp || isDark ? '#cbd5e1' : '#374151' }}
              >
                {gate.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => {
          isScrollingSelf.current = true;
          const el = e.target as HTMLElement;
          onScroll(el.scrollTop);
          requestAnimationFrame(() => { isScrollingSelf.current = false; });
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
                    <rect x={x} y={0} width={colWidth} height={totalHeight} fill={isDark ? '#111827' : '#f9fafb'} />
                  )}
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={totalHeight}
                    stroke={isDark ? '#1f2937' : '#f3f4f6'}
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
                stroke={isDark ? '#1f2937' : '#f3f4f6'}
                strokeWidth={1}
              />
            ))}
          </svg>

          {/* Task bars */}
          <svg
            width={totalWidth}
            height={totalHeight}
            className="absolute top-0 left-0"
          >
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

          {/* Dependency lines layer (on top of task bars for clickability) */}
          <svg
            width={totalWidth}
            height={totalHeight}
            className="absolute top-0 left-0"
            style={{ pointerEvents: 'none' }}
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
                <path d="M 0 0 L 10 5 L 0 10 z" fill={isDark ? '#cbd5e1' : '#94a3b8'} />
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
