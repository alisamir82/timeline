import React from 'react';
import type { ZoomLevel, Task } from '../../types';
import { dateToPixelOffset, parseISO, QUALITY_GATE_BAR_HEIGHT } from '../../utils/dates';
import { useProjectStore } from '../../stores/useProjectStore';

interface QualityGateBarProps {
  gates: Task[];
  timelineStart: Date;
  zoom: ZoomLevel;
  totalWidth: number;
}

export default function QualityGateBar({ gates, timelineStart, zoom, totalWidth }: QualityGateBarProps) {
  const { selectedTaskId, hoveredTaskId, selectTask, openTaskDetails, setHoveredTask, theme } = useProjectStore();
  const isDark = theme === 'dark';

  if (gates.length === 0) return null;

  return (
    <svg width={totalWidth} height={QUALITY_GATE_BAR_HEIGHT} className="absolute top-0 left-0">
      {gates.map((gate) => {
        const cx = dateToPixelOffset(parseISO(gate.startDate), timelineStart, zoom);
        const cy = 14;
        const outerR = 9;
        const innerR = 4;
        const isSelected = selectedTaskId === gate.id;
        const isHovered = hoveredTaskId === gate.id;

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
              fill="#f59e0b"
              stroke={isSelected ? '#2563eb' : isHovered ? '#60a5fa' : 'none'}
              strokeWidth={isSelected || isHovered ? 2 : 0}
            />
            <text
              x={cx}
              y={QUALITY_GATE_BAR_HEIGHT - 4}
              textAnchor="middle"
              className="text-[9px] font-medium"
              fill={isDark ? '#d1d5db' : '#6b7280'}
              style={{ pointerEvents: 'none' }}
            >
              {gate.title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
