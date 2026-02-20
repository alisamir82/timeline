import React, { useRef, useMemo, useEffect, useState } from 'react';
import type { ZoomLevel, Task } from '../../types';
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

interface TimelineGridProps {
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
}

export default function TimelineGrid({ scrollTop, onScroll }: TimelineGridProps) {
  const { project, zoom, getVisibleTasks, getQualityGates, getSplitSiblings, addNoteMode, setAddNoteMode, theme,
    selectedTaskId, hoveredTaskId, selectTask, openTaskDetails, setHoveredTask } = useProjectStore();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingSelf = useRef(false);
  const visibleTasks = getVisibleTasks();
  const qualityGates = getQualityGates();
  const hasGates = qualityGates.length > 0;

  // Sync vertical scroll position from left panel
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

  // Track horizontal scroll to sync header
  const [hScrollLeft, setHScrollLeft] = useState(0);

  const todayX = dateToPixelOffset(new Date(), timelineStart, zoom);

  const columnHeaderHeight = COLUMN_HEADER_HEIGHT;

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

      {/* Fixed header area (scrolls horizontally in sync, stays pinned vertically) */}
      <div className="flex-shrink-0 overflow-hidden">
        <div style={{ transform: `translateX(${-hScrollLeft}px)`, width: totalWidth }}>
          <TimelineHeader
            startDate={timelineStart}
            endDate={timelineEnd}
            zoom={zoom}
            scrollLeft={hScrollLeft}
          />
        </div>
      </div>

      {/* Column header spacer — expands when quality gates exist to show gate stars */}
      <div
        className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative overflow-hidden"
        style={{ height: columnHeaderHeight }}
      >
        {/* Today line + gate stars rendered inside this area */}
        <div style={{ transform: `translateX(${-hScrollLeft}px)`, width: totalWidth, height: columnHeaderHeight, position: 'absolute', top: 0, left: 0 }}>
            <svg width={totalWidth} height={columnHeaderHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Today line through the column header area */}
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={columnHeaderHeight}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <circle cx={todayX} cy={0} r={4} fill="#ef4444" />

              {/* Quality gate stars */}
              {qualityGates.map((gate) => {
                const cx = dateToPixelOffset(parseISO(gate.startDate), timelineStart, zoom);
                const cy = COLUMN_HEADER_HEIGHT - 12;
                const outerR = 5;
                const innerR = 2;

                const pts: string[] = [];
                for (let i = 0; i < 5; i++) {
                  const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
                  const innerAngle = outerAngle + Math.PI / 5;
                  pts.push(`${cx + outerR * Math.cos(outerAngle)},${cy - outerR * Math.sin(outerAngle)}`);
                  pts.push(`${cx + innerR * Math.cos(innerAngle)},${cy - innerR * Math.sin(innerAngle)}`);
                }

                return (
                  <g
                    key={gate.id}
                    className="cursor-pointer"
                    onClick={() => selectTask(gate.id)}
                    onDoubleClick={() => openTaskDetails(gate.id)}
                    onMouseEnter={() => setHoveredTask(gate.id)}
                    onMouseLeave={() => setHoveredTask(null)}
                  >
                    <polygon
                      points={pts.join(' ')}
                      fill={gate.color}
                    />
                    <text
                      x={cx}
                      y={columnHeaderHeight - 1}
                      textAnchor="middle"
                      className="text-[7px]"
                      fill={isDark ? '#d1d5db' : '#6b7280'}
                      style={{ pointerEvents: 'none' }}
                    >
                      {gate.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
      </div>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => {
          isScrollingSelf.current = true;
          const el = e.target as HTMLElement;
          onScroll(el.scrollTop);
          setHScrollLeft(el.scrollLeft);
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

            {/* Task bars (render all split segments on the same row) */}
            {visibleTasks.map((task, i) => {
              if (task.splitGroupId) {
                const siblings = getSplitSiblings(task.splitGroupId);
                return siblings.map((seg) => (
                  <TaskBar
                    key={seg.id}
                    task={seg}
                    rowIndex={i}
                    timelineStart={timelineStart}
                    zoom={zoom}
                  />
                ));
              }
              return (
                <TaskBar
                  key={task.id}
                  task={task}
                  rowIndex={i}
                  timelineStart={timelineStart}
                  zoom={zoom}
                />
              );
            })}

            {/* Today line (vertical dashed line only) */}
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
