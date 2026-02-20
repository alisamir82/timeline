import React, { useCallback, useRef } from 'react';
import type { Task, ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { parseISO, dateToPixelOffset, ROW_HEIGHT } from '../../utils/dates';
import { getDependencyPoints } from '../../utils/dependencies';

interface DependencyLinesProps {
  visibleTasks: Task[];
  timelineStart: Date;
  zoom: ZoomLevel;
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  return pt.matrixTransform(ctm.inverse());
}

// Distance from point p to line segment (a, b)
function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export default function DependencyLines({
  visibleTasks,
  timelineStart,
  zoom,
}: DependencyLinesProps) {
  const { dependencies, hoveredDependencyId, hoveredTaskId, setHoveredDependency, updateDependencyWaypoints, theme } =
    useProjectStore();
  const isDark = theme === 'dark';
  const dragRef = useRef<{
    depId: string;
    waypointIndex: number;
    origX: number;
    origY: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  const taskIndexMap = new Map<string, number>();
  visibleTasks.forEach((t, i) => taskIndexMap.set(t.id, i));

  const taskMap = new Map<string, Task>();
  visibleTasks.forEach((t) => taskMap.set(t.id, t));

  // Build default right-angle path (no waypoints)
  function buildDefaultPath(
    pts: { x1: number; y1: number; x2: number; y2: number },
    depType: string,
  ): string {
    const midX = (pts.x1 + pts.x2) / 2;
    if (depType === 'FS' || depType === 'SF') {
      const offsetX = pts.x1 + 12;
      if (pts.x2 > pts.x1 + 24) {
        return `M ${pts.x1} ${pts.y1} H ${midX} V ${pts.y2} H ${pts.x2}`;
      } else {
        const midY = (pts.y1 + pts.y2) / 2;
        return `M ${pts.x1} ${pts.y1} H ${offsetX} V ${midY} H ${pts.x2 - 12} V ${pts.y2} H ${pts.x2}`;
      }
    } else {
      return `M ${pts.x1} ${pts.y1} H ${Math.min(pts.x1, pts.x2) - 12} V ${pts.y2} H ${pts.x2}`;
    }
  }

  // Build polyline path through waypoints
  function buildWaypointPath(
    pts: { x1: number; y1: number; x2: number; y2: number },
    waypoints: { x: number; y: number }[],
  ): string {
    let d = `M ${pts.x1} ${pts.y1}`;
    for (const wp of waypoints) {
      d += ` L ${wp.x} ${wp.y}`;
    }
    d += ` L ${pts.x2} ${pts.y2}`;
    return d;
  }

  const handleWaypointDragStart = useCallback(
    (e: React.MouseEvent, depId: string, waypointIndex: number, origX: number, origY: number) => {
      e.stopPropagation();
      e.preventDefault();

      const svg = (e.currentTarget as SVGElement).ownerSVGElement;
      if (!svg) return;

      dragRef.current = { depId, waypointIndex, origX, origY, startClientX: e.clientX, startClientY: e.clientY };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const { depId: id, waypointIndex: idx, origX: ox, origY: oy, startClientX, startClientY } = dragRef.current;
        const dep = useProjectStore.getState().dependencies.find((d) => d.id === id);
        if (!dep) return;

        const svgStart = clientToSvg(svg, startClientX, startClientY);
        const svgCurrent = clientToSvg(svg, me.clientX, me.clientY);

        const newWaypoints = [...(dep.waypoints || [])];
        newWaypoints[idx] = { x: ox + (svgCurrent.x - svgStart.x), y: oy + (svgCurrent.y - svgStart.y) };
        useProjectStore.getState().updateDependencyWaypoints(id, newWaypoints);
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    },
    [],
  );

  // Double-click on path to add a new waypoint
  const handlePathDoubleClick = useCallback(
    (e: React.MouseEvent, depId: string, pts: { x1: number; y1: number; x2: number; y2: number }) => {
      e.stopPropagation();
      e.preventDefault();

      const svg = (e.currentTarget as SVGElement).ownerSVGElement;
      if (!svg) return;

      const svgPt = clientToSvg(svg, e.clientX, e.clientY);
      const dep = useProjectStore.getState().dependencies.find((d) => d.id === depId);
      if (!dep) return;

      const wps = dep.waypoints || [];
      const allPoints = [{ x: pts.x1, y: pts.y1 }, ...wps, { x: pts.x2, y: pts.y2 }];

      // Find closest segment to insert the new waypoint into
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < allPoints.length - 1; i++) {
        const d = distToSegment(svgPt, allPoints[i], allPoints[i + 1]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      const newWaypoints = [...wps];
      newWaypoints.splice(bestIdx, 0, { x: svgPt.x, y: svgPt.y });
      useProjectStore.getState().updateDependencyWaypoints(depId, newWaypoints);
    },
    [],
  );

  // Double-click on a waypoint handle to remove it
  const handleWaypointDoubleClick = useCallback((e: React.MouseEvent, depId: string, waypointIndex: number) => {
    e.stopPropagation();
    e.preventDefault();

    const dep = useProjectStore.getState().dependencies.find((d) => d.id === depId);
    if (!dep) return;

    const newWaypoints = (dep.waypoints || []).filter((_, i) => i !== waypointIndex);
    useProjectStore.getState().updateDependencyWaypoints(depId, newWaypoints);
  }, []);

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
        const waypoints = dep.waypoints || [];

        const isHighlighted =
          hoveredDependencyId === dep.id ||
          hoveredTaskId === dep.predecessorTaskId ||
          hoveredTaskId === dep.successorTaskId;

        const path =
          waypoints.length > 0
            ? buildWaypointPath(pts, waypoints)
            : buildDefaultPath(pts, dep.type);

        return (
          <g
            key={dep.id}
            onMouseEnter={() => setHoveredDependency(dep.id)}
            onMouseLeave={() => {
              if (!dragRef.current) setHoveredDependency(null);
            }}
          >
            {/* Wider invisible hit area */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="cursor-pointer"
              onDoubleClick={(e) => handlePathDoubleClick(e, dep.id, pts)}
            />
            {/* Visible line */}
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
            {/* Waypoint handles (visible when highlighted) */}
            {isHighlighted &&
              waypoints.map((wp, i) => (
                <circle
                  key={i}
                  cx={wp.x}
                  cy={wp.y}
                  r={5}
                  fill={isDark ? '#93c5fd' : '#3b82f6'}
                  stroke="white"
                  strokeWidth={2}
                  className="cursor-grab"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                  onMouseDown={(e) => handleWaypointDragStart(e, dep.id, i, wp.x, wp.y)}
                  onDoubleClick={(e) => handleWaypointDoubleClick(e, dep.id, i)}
                />
              ))}
          </g>
        );
      })}
    </>
  );
}
