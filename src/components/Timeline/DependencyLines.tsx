import React from 'react';
import type { Task, Dependency, ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { parseISO, dateToPixelOffset, ROW_HEIGHT } from '../../utils/dates';
import { getDependencyPoints } from '../../utils/dependencies';

interface DependencyLinesProps {
  visibleTasks: Task[];
  timelineStart: Date;
  zoom: ZoomLevel;
}

export default function DependencyLines({
  visibleTasks,
  timelineStart,
  zoom,
}: DependencyLinesProps) {
  const { dependencies, tasks: allTasks, hoveredDependencyId, hoveredTaskId, setHoveredDependency, deleteDependency, theme } =
    useProjectStore();
  const isDark = theme === 'dark';

  // Build index map: map each task ID (including split segments) to its visible row index
  const taskIndexMap = new Map<string, number>();
  visibleTasks.forEach((t, i) => {
    taskIndexMap.set(t.id, i);
    // Also map all split siblings to the same row index
    if (t.splitGroupId) {
      allTasks.filter((s) => s.splitGroupId === t.splitGroupId).forEach((s) => {
        taskIndexMap.set(s.id, i);
      });
    }
  });

  // Build task map from all tasks (not just visible) so we can resolve split segments
  const taskMap = new Map<string, Task>();
  allTasks.forEach((t) => taskMap.set(t.id, t));

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
          width: Math.max(dateToPixelOffset(predEnd, timelineStart, zoom) - dateToPixelOffset(predStart, timelineStart, zoom), 20),
          height: barHeight,
        };
        const succRect = {
          x: dateToPixelOffset(succStart, timelineStart, zoom),
          y: succIdx * ROW_HEIGHT + 4,
          width: Math.max(dateToPixelOffset(succEnd, timelineStart, zoom) - dateToPixelOffset(succStart, timelineStart, zoom), 20),
          height: barHeight,
        };

        const pts = getDependencyPoints(dep.type, predRect, succRect);

        const isHighlighted =
          hoveredDependencyId === dep.id ||
          hoveredTaskId === dep.predecessorTaskId ||
          hoveredTaskId === dep.successorTaskId;

        // Create a path with right-angle routing
        const midX = (pts.x1 + pts.x2) / 2;
        let path: string;
        if (dep.type === 'FS' || dep.type === 'SF') {
          const offsetX = pts.x1 + 12;
          if (pts.x2 > pts.x1 + 24) {
            path = `M ${pts.x1} ${pts.y1} H ${midX} V ${pts.y2} H ${pts.x2}`;
          } else {
            const midY = (pts.y1 + pts.y2) / 2;
            path = `M ${pts.x1} ${pts.y1} H ${offsetX} V ${midY} H ${pts.x2 - 12} V ${pts.y2} H ${pts.x2}`;
          }
        } else {
          path = `M ${pts.x1} ${pts.y1} H ${Math.min(pts.x1, pts.x2) - 12} V ${pts.y2} H ${pts.x2}`;
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
              stroke={isHighlighted ? '#3b82f6' : isDark ? '#cbd5e1' : '#94a3b8'}
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
