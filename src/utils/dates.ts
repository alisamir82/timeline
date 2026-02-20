import {
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  differenceInDays,
  differenceInCalendarDays,
  format,
  parseISO,
  isWeekend,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isWithinInterval,
  max,
  min,
} from 'date-fns';
import type { ZoomLevel } from '../types';

export {
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  differenceInCalendarDays,
  format,
  parseISO,
  isWeekend,
  isSameDay,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  startOfDay,
};

// Column width in pixels per zoom level
export const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  day: 40,
  week: 120,
  month: 180,
  quarter: 240,
};

export const ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 60;
export const COLUMN_HEADER_HEIGHT = 26;
export const QUALITY_GATE_BAR_HEIGHT = 31;
export const LEFT_PANEL_DEFAULT_WIDTH = 420;

export function getTimelineUnits(
  startDate: Date,
  endDate: Date,
  zoom: ZoomLevel
): Date[] {
  switch (zoom) {
    case 'day':
      return eachDayOfInterval({ start: startDate, end: endDate });
    case 'week':
      return eachWeekOfInterval(
        { start: startOfWeek(startDate, { weekStartsOn: 1 }), end: endDate },
        { weekStartsOn: 1 }
      );
    case 'month':
      return eachMonthOfInterval({ start: startOfMonth(startDate), end: endDate });
    case 'quarter': {
      const units: Date[] = [];
      let current = startOfQuarter(startDate);
      while (current <= endDate) {
        units.push(current);
        current = addMonths(current, 3);
      }
      return units;
    }
  }
}

export function getUnitEnd(date: Date, zoom: ZoomLevel): Date {
  switch (zoom) {
    case 'day':
      return date;
    case 'week':
      return endOfWeek(date, { weekStartsOn: 1 });
    case 'month':
      return endOfMonth(date);
    case 'quarter':
      return endOfQuarter(date);
  }
}

export function formatUnitLabel(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day':
      return format(date, 'EEEEEE d');
    case 'week':
      return format(date, 'MMM d');
    case 'month':
      return format(date, 'MMM yyyy');
    case 'quarter':
      return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, 'yyyy')}`;
  }
}

export function formatHeaderLabel(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day': {
      const monday = startOfWeek(date, { weekStartsOn: 1 });
      return `w/c ${format(monday, 'dd MMM')}`;
    }
    case 'week':
      return format(date, 'MMM yyyy');
    case 'month':
      return format(date, 'yyyy');
    case 'quarter':
      return format(date, 'yyyy');
  }
}

export function dateToPixelOffset(
  date: Date,
  timelineStart: Date,
  zoom: ZoomLevel
): number {
  const days = differenceInCalendarDays(date, timelineStart);
  const colWidth = COLUMN_WIDTHS[zoom];

  switch (zoom) {
    case 'day':
      return days * colWidth;
    case 'week':
      return (days / 7) * colWidth;
    case 'month':
      return (days / 30) * colWidth;
    case 'quarter':
      return (days / 91) * colWidth;
  }
}

export function pixelOffsetToDate(
  px: number,
  timelineStart: Date,
  zoom: ZoomLevel
): Date {
  const colWidth = COLUMN_WIDTHS[zoom];

  let days: number;
  switch (zoom) {
    case 'day':
      days = px / colWidth;
      break;
    case 'week':
      days = (px / colWidth) * 7;
      break;
    case 'month':
      days = (px / colWidth) * 30;
      break;
    case 'quarter':
      days = (px / colWidth) * 91;
      break;
  }

  return startOfDay(addDays(timelineStart, Math.round(days)));
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
