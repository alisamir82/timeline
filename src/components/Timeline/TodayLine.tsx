import React from 'react';
import type { ZoomLevel } from '../../types';
import { dateToPixelOffset } from '../../utils/dates';

interface TodayLineProps {
  timelineStart: Date;
  zoom: ZoomLevel;
  height: number;
}

export default function TodayLine({ timelineStart, zoom, height }: TodayLineProps) {
  const today = new Date();
  const x = dateToPixelOffset(today, timelineStart, zoom);

  return (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={height}
      stroke="#ef4444"
      strokeWidth={1.5}
      strokeDasharray="4 2"
    />
  );
}
