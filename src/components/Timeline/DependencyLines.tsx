import React, { useMemo } from 'react';
import type { Task, Dependency, ZoomLevel } from '../../types';
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
 * Check if a vertical line at `x` would intersect any bar (with margin).
 */
function isXBlocked(
  x: number,
  bars: Array<{ left: number; right: number }>,
  margin: number
): boolean {
  return bars.some((b) => x >= b.left - margin && x <= b.right + margin);
}

/**
 * Find the nearest x to `desiredX` that doesn't intersect any task bar
 * on the intermediate rows between minRow and maxRow (exclusive).
 */
function findClearX(
  desiredX: number,
  minRow: number,
  maxRow: number,
  rowBarRects: Map<number, Array<{ left: number; right: number }>>,
  margin: number
): number {
  // Adjacent or same rows — no intermediate obstacles
  if (maxRow - minRow <= 1) return desiredX;

  // Collect obstacles from intermediate rows only
  const obstacles: Array<{ left: number; right: number }> = [];
  for (let row = minRow + 1; row < maxRow; row++) {
    const bars = rowBarRects.get(row);
    if (bars) obstacles.push(...bars);
  }

  if (obstacles.length === 0 || !isXBlocked(desiredX, obstacles, margin)) {
    return desiredX;
  }

  // Merge overlapping obstacle ranges (with margin applied)
  const ranges = obstacles
    .map((o) => ({ left: o.left - margin, right: o.right + margin }))
    .sort((a, b) => a.left - b.left);

  const merged: Array<{ left: number; right: number }> = [];
  for (const r of ranges) {
    if (merged.length > 0 && r.left <= merged[merged.length - 1].right) {
      merged[merged.length - 1].right = Math.max(
        merged[merged.length - 1].right,
        r.right
      );
    } else {
      merged.push({ ...r });
    }
  }

  // Find nearest clear x on both sides
  let bestRight = Infinity;
  let bestLeft = -Infinity;

  for (const m of merged) {
    if (desiredX >= m.left && desiredX <= m.right) {
      bestRight = m.right + 1;
      bestLeft = m.left - 1;
      break;
    }
  }

  // Verify candidates don't fall into another merged range
  if (bestRight !== Infinity && isXBlocked(bestRight, obstacles, margin)) {
    for (const m of merged) {
      const candidate = m.right + 1;
      if (candidate > desiredX && !isXBlocked(candidate, obstacles, margin)) {
        bestRight = candidate;
        break;
      }
    }
    if (isXBlocked(bestRight, obstacles, margin)) {
      bestRight = merged[merged.length - 1].right + 1;
    }
  }

  if (bestLeft !== -Infinity && isXBlocked(bestLeft, obstacles, margin)) {
    for (let i = merged.length - 1; i >= 0; i--) {
      const candidate = merged[i].left - 1;
      if (candidate < desiredX && !isXBlocked(candidate, obstacles, margin)) {
        bestLeft = candidate;
        break;
      }
    }
    if (isXBlocked(bestLeft, obstacles, margin)) {
      bestLeft = merged[0].left - 1;
    }
  }

  // Pick the closer side
  const distRight =
    bestRight === Infinity ? Infinity : Math.abs(bestRight - desiredX);
  const distLeft =
    bestLeft === -Infinity ? Infinity : Math.abs(bestLeft - desiredX);

  return distRight <= distLeft ? bestRight : bestLeft;
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
    theme,
  } = useProjectStore();
  const isDark = theme === 'dark';

  // Build index map: map each task ID (including split segments) to its visible row index
  const taskIndexMap = new Map<string, number>();
  visibleTasks.forEach((t, i) => {
    taskIndexMap.set(t.id, i);
    // Also map all split siblings to the same row index
    if (t.splitGroupId) {
      allTasks
        .filter((s) => s.splitGroupId === t.splitGroupId)
        .forEach((s) => {
          taskIndexMap.set(s.id, i);
        });
    }
  });

  // Build task map from all tasks (not just visible) so we can resolve split segments
  const taskMap = new Map<string, Task>();
  allTasks.forEach((t) => taskMap.set(t.id, t));

  // Build bar rects per row for obstacle-aware routing
  const rowBarRects = useMemo(() => {
    const map = new Map<number, Array<{ left: number; right: number }>>();
    visibleTasks.forEach((task, rowIdx) => {
      const bars: Array<{ left: number; right: number }> = [];
      if (task.splitGroupId) {
        const siblings = allTasks.filter(
          (t) =>
            t.splitGroupId === task.splitGroupId &&
            t.id !== task.splitGroupId
        );
        siblings.forEach((seg) => {
          const sx = dateToPixelOffset(
            parseISO(seg.startDate),
            timelineStart,
            zoom
          );
          const ex = dateToPixelOffset(
            parseISO(seg.endDate),
            timelineStart,
            zoom
          );
          bars.push({ left: sx, right: Math.max(ex, sx + 20) });
        });
      } else if (task.type === 'milestone') {
        const sx = dateToPixelOffset(
          parseISO(task.startDate),
          timelineStart,
          zoom
        );
        bars.push({ left: sx - 10, right: sx + 10 });
      } else {
        const sx = dateToPixelOffset(
          parseISO(task.startDate),
          timelineStart,
          zoom
        );
        const ex = dateToPixelOffset(
          parseISO(task.endDate),
          timelineStart,
          zoom
        );
        bars.push({ left: sx, right: Math.max(ex, sx + 20) });
      }
      map.set(rowIdx, bars);
    });
    return map;
  }, [visibleTasks, allTasks, timelineStart, zoom]);

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

        const isHighlighted =
          hoveredDependencyId === dep.id ||
          hoveredTaskId === dep.predecessorTaskId ||
          hoveredTaskId === dep.successorTaskId;

        const minRow = Math.min(predIdx, succIdx);
        const maxRow = Math.max(predIdx, succIdx);

        let path: string;

        if (dep.type === 'FS' || dep.type === 'SF') {
          if (pts.x2 > pts.x1 + 24) {
            // Enough horizontal space — 3-segment path through midpoint
            const midX = (pts.x1 + pts.x2) / 2;
            const clearX = findClearX(
              midX,
              minRow,
              maxRow,
              rowBarRects,
              ROUTE_MARGIN
            );
            path = `M ${pts.x1} ${pts.y1} H ${clearX} V ${pts.y2} H ${pts.x2}`;
          } else {
            // Backward or overlapping — route to the right of all bars in range
            const allBarsInRange: Array<{ left: number; right: number }> = [];
            for (let row = minRow; row <= maxRow; row++) {
              const bars = rowBarRects.get(row);
              if (bars) allBarsInRange.push(...bars);
            }
            const maxRight =
              allBarsInRange.length > 0
                ? Math.max(...allBarsInRange.map((b) => b.right)) +
                  ROUTE_MARGIN
                : Math.max(pts.x1, pts.x2) + ROUTE_MARGIN;
            const clearX = findClearX(
              maxRight,
              minRow,
              maxRow,
              rowBarRects,
              ROUTE_MARGIN
            );
            path = `M ${pts.x1} ${pts.y1} H ${clearX} V ${pts.y2} H ${pts.x2}`;
          }
        } else if (dep.type === 'SS') {
          // Both exit from left — route to the left of both
          const leftOfBoth = Math.min(pts.x1, pts.x2) - ROUTE_MARGIN;
          const clearX = findClearX(
            leftOfBoth,
            minRow,
            maxRow,
            rowBarRects,
            ROUTE_MARGIN
          );
          path = `M ${pts.x1} ${pts.y1} H ${clearX} V ${pts.y2} H ${pts.x2}`;
        } else {
          // FF: both exit from right — route to the right of both
          const rightOfBoth = Math.max(pts.x1, pts.x2) + ROUTE_MARGIN;
          const clearX = findClearX(
            rightOfBoth,
            minRow,
            maxRow,
            rowBarRects,
            ROUTE_MARGIN
          );
          path = `M ${pts.x1} ${pts.y1} H ${clearX} V ${pts.y2} H ${pts.x2}`;
        }

        return (
          <g key={dep.id}>
            {/* Wider invisible hit area */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredDependency(dep.id)}
              onMouseLeave={() => setHoveredDependency(null)}
            />
            {/* Visible dotted line */}
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
          </g>
        );
      })}
    </>
  );
}
