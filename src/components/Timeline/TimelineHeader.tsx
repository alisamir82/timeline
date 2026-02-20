import React from 'react';
import type { ZoomLevel, Task } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import {
  getTimelineUnits,
  formatUnitLabel,
  formatHeaderLabel,
  COLUMN_WIDTHS,
  HEADER_HEIGHT,
  QUALITY_GATE_BAR_HEIGHT,
  isWeekend,
  dateToPixelOffset,
  parseISO,
} from '../../utils/dates';

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  zoom: ZoomLevel;
  scrollLeft: number;
  gates: Task[];
  todayX: number;
}

const TOP_ROW_HEIGHT = 30;
const DATE_ROW_HEIGHT = 30;

export default function TimelineHeader({
  startDate,
  endDate,
  zoom,
  gates,
  todayX,
}: TimelineHeaderProps) {
  const { selectedTaskId, hoveredTaskId, selectTask, openTaskDetails, setHoveredTask, theme } = useProjectStore();
  const isDark = theme === 'dark';
  const units = getTimelineUnits(startDate, endDate, zoom);
  const colWidth = COLUMN_WIDTHS[zoom];
  const totalWidth = units.length * colWidth;
  const hasGates = gates.length > 0;
  const bottomRowHeight = DATE_ROW_HEIGHT + (hasGates ? QUALITY_GATE_BAR_HEIGHT : 0);
  const totalHeight = TOP_ROW_HEIGHT + bottomRowHeight;

  // Group consecutive units by parent period for the top header row
  const groups: Array<{ label: string; count: number }> = [];
  for (const unit of units) {
    const label = formatHeaderLabel(unit, zoom);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.count++;
    } else {
      groups.push({ label, count: 1 });
    }
  }

  return (
    <div
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 relative"
      style={{ height: totalHeight }}
    >
      {/* Top row: grouped headers */}
      <div className="flex border-b border-gray-100 dark:border-gray-700" style={{ height: TOP_ROW_HEIGHT }}>
        {groups.map((group, i) => {
          const groupWidth = group.count * colWidth;
          return (
            <div
              key={i}
              className="flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 overflow-hidden whitespace-nowrap"
              style={{ width: groupWidth, minWidth: 0 }}
              title={group.label}
            >
              {groupWidth >= 60 ? group.label : ''}
            </div>
          );
        })}
      </div>

      {/* Bottom row: individual dates (+ gate area below if gates exist) */}
      <div className="relative" style={{ height: bottomRowHeight }}>
        {/* Date labels */}
        <div className="flex" style={{ height: DATE_ROW_HEIGHT }}>
          {units.map((unit, i) => {
            const weekend = zoom === 'day' && isWeekend(unit);
            return (
              <div
                key={i}
                className={`flex items-center justify-center text-[11px] border-r border-gray-100 dark:border-gray-700
                  ${weekend ? 'bg-gray-50 dark:bg-gray-800 text-gray-400' : 'text-gray-500 dark:text-gray-400'}
                `}
                style={{ width: colWidth, minWidth: colWidth }}
              >
                {formatUnitLabel(unit, zoom)}
              </div>
            );
          })}
        </div>

        {/* Quality gate stars (rendered below date labels) */}
        {hasGates && (
          <svg
            width={totalWidth}
            height={QUALITY_GATE_BAR_HEIGHT}
            className="absolute left-0"
            style={{ top: DATE_ROW_HEIGHT }}
          >
            {gates.map((gate) => {
              const cx = dateToPixelOffset(parseISO(gate.startDate), startDate, zoom);
              const cy = 13;
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
                    y={QUALITY_GATE_BAR_HEIGHT - 3}
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
        )}

        {/* Today line through the entire bottom area (dates + gates) */}
        <svg
          width={totalWidth}
          height={bottomRowHeight}
          className="absolute top-0 left-0"
          style={{ pointerEvents: 'none' }}
        >
          <line
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={bottomRowHeight}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        </svg>
      </div>

      {/* Today marker - above the dates, at the junction of top and bottom rows */}
      <svg
        width={totalWidth}
        height={totalHeight}
        className="absolute top-0 left-0"
        style={{ pointerEvents: 'none' }}
      >
        <circle cx={todayX} cy={TOP_ROW_HEIGHT} r={4} fill="#ef4444" />
        <text
          x={todayX + 6}
          y={TOP_ROW_HEIGHT - 6}
          className="text-[10px] font-medium"
          fill="#ef4444"
        >
          Today
        </text>
      </svg>
    </div>
  );
}
