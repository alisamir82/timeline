import React, { useRef, useCallback } from 'react';
import type { Task, ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { parseISO, dateToPixelOffset, ROW_HEIGHT } from '../../utils/dates';
import { getDependencyPoints } from '../../utils/dependencies';

interface DependencyLinesProps {
  visibleTasks: Task[];
  timelineStart: Date;
  zoom: ZoomLevel;
}

const ROUTE_MARGIN = 14;

/**
 * Compute the default vertical-bend x for auto-routing.
 */
function autoVerticalX(
  depType: string,
  pts: { x1: number; y1: number; x2: number; y2: number }
): number {
  if (depType === 'FS' || depType === 'SF') {
    if (pts.x2 > pts.x1 + 24) {
      return (pts.x1 + pts.x2) / 2;
    }
    return Math.max(pts.x1, pts.x2) + ROUTE_MARGIN * 2;
  }
  if (depType === 'SS') {
    return Math.min(pts.x1, pts.x2) - ROUTE_MARGIN;
  }
  // FF
  return Math.max(pts.x1, pts.x2) + ROUTE_MARGIN;
}

export default function DependencyLines({
  visibleTasks,
  timelineStart,
  zoom,
}: DependencyLinesProps) {
  const {
    dependencies,
    tasks: allTasks,
    hoveredDependencyId,
    hoveredTaskId,
    setHoveredDependency,
    updateDependencyRoute,
    theme,
  } = useProjectStore();
  const isDark = theme === 'dark';

  const dragRef = useRef<{
    depId: string;
    startMouseX: number;
    originalVx: number;
  } | null>(null);

  // Build index map: map each task ID (including split segments) to its visible row index
  const taskIndexMap = new Map<string, number>();
  visibleTasks.forEach((t, i) => {
    taskIndexMap.set(t.id, i);
    if (t.splitGroupId) {
      allTasks
        .filter((s) => s.splitGroupId === t.splitGroupId)
        .forEach((s) => {
          taskIndexMap.set(s.id, i);
        });
    }
  });

  // Build task map from all tasks so we can resolve split segments
  const taskMap = new Map<string, Task>();
  allTasks.forEach((t) => taskMap.set(t.id, t));

  const handleDragStart = useCallback(
    (e: React.MouseEvent, depId: string, currentVx: number) => {
      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        depId,
        startMouseX: e.clientX,
        originalVx: currentVx,
      };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = me.clientX - dragRef.current.startMouseX;
        const newVx = dragRef.current.originalVx + dx;
        updateDependencyRoute(dragRef.current.depId, [newVx]);
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    },
    [updateDependencyRoute]
  );

  // Double-click resets to auto-routing
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, depId: string) => {
      e.preventDefault();
      e.stopPropagation();
      updateDependencyRoute(depId, null);
    },
    [updateDependencyRoute]
  );

  return (
    <>
      {dependencies.map((dep) => {
        const pred = taskMap.get(dep.predecessorTaskId);
        const succ = taskMap.get(dep.successorTaskId);
        if (!pred || !succ) return null;

        const predIdx = taskIndexMap.get(dep.predecessorTaskId);
        const succIdx = taskIndexMap.get(dep.successorTaskId);
        if (predIdx === undefined || succIdx === undefined) return null;

        const predStart = parseISO(pred.startDate);
        const predEnd = parseISO(pred.endDate);
        const succStart = parseISO(succ.startDate);
        const succEnd = parseISO(succ.endDate);

        const barHeight = ROW_HEIGHT - 8;
        const predRect = {
          x: dateToPixelOffset(predStart, timelineStart, zoom),
          y: predIdx * ROW_HEIGHT + 4,
          width: Math.max(
            dateToPixelOffset(predEnd, timelineStart, zoom) -
              dateToPixelOffset(predStart, timelineStart, zoom),
            20
          ),
          height: barHeight,
        };
        const succRect = {
          x: dateToPixelOffset(succStart, timelineStart, zoom),
          y: succIdx * ROW_HEIGHT + 4,
          width: Math.max(
            dateToPixelOffset(succEnd, timelineStart, zoom) -
              dateToPixelOffset(succStart, timelineStart, zoom),
            20
          ),
          height: barHeight,
        };

        const pts = getDependencyPoints(dep.type, predRect, succRect);

        // Determine vertical bend x: manual or auto
        const vx =
          dep.manualRoute && dep.manualRoute.length >= 1
            ? dep.manualRoute[0]
            : autoVerticalX(dep.type, pts);

        const isManual = dep.manualRoute != null && dep.manualRoute.length > 0;

        // 3-segment path: H → V → H
        const path = `M ${pts.x1} ${pts.y1} H ${vx} V ${pts.y2} H ${pts.x2}`;

        const isHighlighted =
          hoveredDependencyId === dep.id ||
          hoveredTaskId === dep.predecessorTaskId ||
          hoveredTaskId === dep.successorTaskId;

        // Vertical segment top/bottom
        const vTop = Math.min(pts.y1, pts.y2);
        const vBottom = Math.max(pts.y1, pts.y2);

        return (
          <g
            key={dep.id}
            onMouseEnter={() => setHoveredDependency(dep.id)}
            onMouseLeave={() => setHoveredDependency(null)}
          >
            {/* Visible path */}
            <path
              d={path}
              fill="none"
              stroke={
                isHighlighted ? '#3b82f6' : isDark ? '#cbd5e1' : '#94a3b8'
              }
              strokeWidth={isHighlighted ? 2 : 1.5}
              strokeDasharray={isHighlighted ? 'none' : '4 3'}
              markerEnd={`url(#arrow${isHighlighted ? '-active' : ''})`}
              style={{
                transition: 'stroke 0.15s, stroke-width 0.15s',
                pointerEvents: 'none',
              }}
            />

            {/* Hit area: first H segment (hover only) */}
            <line
              x1={pts.x1}
              y1={pts.y1}
              x2={vx}
              y2={pts.y1}
              stroke="transparent"
              strokeWidth={12}
              className="cursor-pointer"
            />

            {/* Hit area: V segment — DRAGGABLE left/right */}
            <line
              x1={vx}
              y1={vTop}
              x2={vx}
              y2={vBottom}
              stroke="transparent"
              strokeWidth={14}
              className="cursor-col-resize"
              onMouseDown={(e) => handleDragStart(e, dep.id, vx)}
              onDoubleClick={(e) => handleDoubleClick(e, dep.id)}
            />

            {/* Hit area: last H segment (hover only) */}
            <line
              x1={vx}
              y1={pts.y2}
              x2={pts.x2}
              y2={pts.y2}
              stroke="transparent"
              strokeWidth={12}
              className="cursor-pointer"
            />

            {/* Bend-point dots shown on highlight */}
            {isHighlighted && (
              <>
                <circle
                  cx={vx}
                  cy={pts.y1}
                  r={3.5}
                  fill={isManual ? '#f59e0b' : '#3b82f6'}
                  stroke="white"
                  strokeWidth={1}
                  style={{ pointerEvents: 'none' }}
                />
                <circle
                  cx={vx}
                  cy={pts.y2}
                  r={3.5}
                  fill={isManual ? '#f59e0b' : '#3b82f6'}
                  stroke="white"
                  strokeWidth={1}
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}
          </g>
        );
      })}
    </>
  );
}
