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

  // Group consecutive units by parent period for the top header row
  // Use an array (not Map) to preserve order and handle repeated labels correctly
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
      className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Top row: grouped headers */}
      <div className="flex h-1/2 border-b border-gray-100 dark:border-gray-700">
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

      {/* Bottom row: individual units */}
      <div className="flex h-1/2">
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
    </div>
  );
}
