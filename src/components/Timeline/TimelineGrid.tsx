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
  QUALITY_GATE_BAR_HEIGHT,
  isWeekend,
  dateToPixelOffset,
} from '../../utils/dates';
import TimelineHeader from './TimelineHeader';
import TaskBar from './TaskBar';
import DependencyLines from './DependencyLines';
import TodayLine from './TodayLine';
import QualityGateBar from './QualityGateBar';
import StickyNoteLayer from './StickyNoteLayer';

interface TimelineGridProps {
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
}

export default function TimelineGrid({ scrollTop, onScroll }: TimelineGridProps) {
  const { project, zoom, getVisibleTasks, getQualityGates, getSplitSiblings, addNoteMode, setAddNoteMode, theme } = useProjectStore();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingSelf = useRef(false);
  const headerRef = useRef<HTMLDivElement>(null);
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

  // Track horizontal scroll to sync header/gate bar
  const [hScrollLeft, setHScrollLeft] = useState(0);

  const gateBarHeight = hasGates ? QUALITY_GATE_BAR_HEIGHT : 0;
  const todayX = dateToPixelOffset(new Date(), timelineStart, zoom);

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
      <div ref={headerRef} className="flex-shrink-0 overflow-hidden">
        <div style={{ transform: `translateX(${-hScrollLeft}px)`, width: totalWidth }}>
          {/* Timeline date header */}
          <TimelineHeader
            startDate={timelineStart}
            endDate={timelineEnd}
            zoom={zoom}
            scrollLeft={hScrollLeft}
          />

          {/* Quality Gate bar */}
          {hasGates && (
            <div className="relative border-b border-gray-200 dark:border-gray-700 bg-amber-50/30 dark:bg-amber-900/10" style={{ height: QUALITY_GATE_BAR_HEIGHT }}>
              <QualityGateBar
                gates={qualityGates}
                timelineStart={timelineStart}
                zoom={zoom}
                totalWidth={totalWidth}
              />
              {/* Today line through the gate bar */}
              <svg width={totalWidth} height={QUALITY_GATE_BAR_HEIGHT} className="absolute top-0 left-0" style={{ pointerEvents: 'none' }}>
                <line
                  x1={todayX}
                  y1={0}
                  x2={todayX}
                  y2={QUALITY_GATE_BAR_HEIGHT}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Spacer matching left panel column headers height */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" style={{ height: COLUMN_HEADER_HEIGHT }} />

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
