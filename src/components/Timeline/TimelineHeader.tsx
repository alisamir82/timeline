import React from 'react';
import type { ZoomLevel } from '../../types';
import {
  getTimelineUnits,
  formatUnitLabel,
  formatHeaderLabel,
  COLUMN_WIDTHS,
  HEADER_HEIGHT,
  isWeekend,
} from '../../utils/dates';

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  zoom: ZoomLevel;
  scrollLeft: number;
}

export default function TimelineHeader({
  startDate,
  endDate,
  zoom,
  scrollLeft,
}: TimelineHeaderProps) {
  const units = getTimelineUnits(startDate, endDate, zoom);
  const colWidth = COLUMN_WIDTHS[zoom];

  // Group units by parent period for the top header row
  const groups: Map<string, { label: string; count: number }> = new Map();
  for (const unit of units) {
    const label = formatHeaderLabel(unit, zoom);
    const existing = groups.get(label);
    if (existing) {
      existing.count++;
    } else {
      groups.set(label, { label, count: 1 });
    }
  }

  return (
    <div
      className="sticky top-0 z-20 bg-white border-b border-gray-200"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Top row: grouped headers */}
      <div className="flex h-1/2 border-b border-gray-100">
        {Array.from(groups.values()).map((group, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-xs font-semibold text-gray-600 border-r border-gray-100"
            style={{ width: group.count * colWidth }}
          >
            {group.label}
          </div>
        ))}
      </div>

      {/* Bottom row: individual units */}
      <div className="flex h-1/2">
        {units.map((unit, i) => {
          const weekend = zoom === 'day' && isWeekend(unit);
          return (
            <div
              key={i}
              className={`flex items-center justify-center text-[11px] border-r border-gray-100
                ${weekend ? 'bg-gray-50 text-gray-400' : 'text-gray-500'}
              `}
              style={{ width: colWidth, minWidth: colWidth }}
            >
              {formatUnitLabel(unit, zoom)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
