import jsPDF from 'jspdf';
import type { Task, Dependency, CustomFieldDefinition, CustomFieldValue, ZoomLevel, Project, StickyNote } from '../../types';
import { RAG_COLORS } from '../../types';
import {
  parseISO,
  addDays,
  format,
  isWeekend,
  getTimelineUnits,
  formatUnitLabel,
  formatHeaderLabel,
  COLUMN_WIDTHS,
  dateToPixelOffset,
} from '../../utils/dates';
import { getDependencyPoints } from '../../utils/dependencies';

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 50;
const TITLE_HEIGHT = 44;
const TASK_LABEL_WIDTH = 200;
const PADDING = 20;

export interface ExportOptions {
  project: Project;
  tasks: Task[];
  dependencies: Dependency[];
  stickyNotes: StickyNote[];
  zoom: ZoomLevel;
  dark?: boolean;
}

function getTimelineBounds(opts: ExportOptions) {
  const { project, tasks, zoom } = opts;
  const timelineStart = addDays(parseISO(project.startDate), -7);
  const timelineEnd = addDays(parseISO(project.endDate), 14);
  const units = getTimelineUnits(timelineStart, timelineEnd, zoom);
  const colWidth = COLUMN_WIDTHS[zoom];
  const gridWidth = units.length * colWidth;
  const totalWidth = TASK_LABEL_WIDTH + gridWidth + PADDING * 2;
  const totalHeight = TITLE_HEIGHT + HEADER_HEIGHT + tasks.length * ROW_HEIGHT + PADDING * 2;
  return { timelineStart, timelineEnd, units, colWidth, gridWidth, totalWidth, totalHeight };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function renderToCanvas(opts: ExportOptions): HTMLCanvasElement {
  const { project, tasks, dependencies, stickyNotes, zoom } = opts;
  const { timelineStart, units, colWidth, gridWidth, totalWidth, totalHeight } = getTimelineBounds(opts);

  const dark = opts.dark ?? false;
  const colors = dark ? {
    bg: '#111827',        // gray-900
    headerBg: '#1f2937',  // gray-800
    text: '#f9fafb',      // gray-50
    textSecondary: '#9ca3af', // gray-400
    gridLine: '#374151',  // gray-700
    gridLineFine: '#1f2937', // gray-800
    border: '#374151',    // gray-700
    altRow: '#1a2332',
    todayText: '#ef4444',
  } : {
    bg: '#ffffff',
    headerBg: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    gridLine: '#e5e7eb',
    gridLineFine: '#f3f4f6',
    border: '#d1d5db',
    altRow: '#fafbfc',
    todayText: '#ef4444',
  };

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  const ox = PADDING;
  const oy = PADDING;
  const gridLeft = ox + TASK_LABEL_WIDTH;
  const headerTop = oy + TITLE_HEIGHT;
  const bodyTop = headerTop + HEADER_HEIGHT;

  // ===== Project title =====
  ctx.fillStyle = colors.text;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(project.name, ox, oy + 18);

  ctx.fillStyle = colors.textSecondary;
  ctx.font = `11px ${FONT}`;
  const dateRange = `${format(parseISO(project.startDate), 'MMM d, yyyy')} – ${format(parseISO(project.endDate), 'MMM d, yyyy')}`;
  ctx.fillText(dateRange, ox, oy + 34);

  ctx.textAlign = 'right';
  ctx.fillText(`Exported ${format(new Date(), 'MMM d, yyyy HH:mm')}`, ox + totalWidth - PADDING * 2, oy + 34);
  ctx.textAlign = 'left';

  // ===== Header background =====
  ctx.fillStyle = colors.headerBg;
  ctx.fillRect(ox, headerTop, totalWidth - PADDING * 2, HEADER_HEIGHT);

  // ===== Grouped header (top half) =====
  const groups: { label: string; count: number }[] = [];
  let lastLabel = '';
  for (const unit of units) {
    const label = formatHeaderLabel(unit, zoom);
    if (label === lastLabel && groups.length > 0) {
      groups[groups.length - 1].count++;
    } else {
      groups.push({ label, count: 1 });
      lastLabel = label;
    }
  }

  ctx.font = `bold 10px ${FONT}`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  let gx = gridLeft;
  for (const g of groups) {
    const w = g.count * colWidth;
    ctx.fillText(g.label, gx + w / 2, headerTop + 18);
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(gx + w, headerTop);
    ctx.lineTo(gx + w, headerTop + HEADER_HEIGHT / 2);
    ctx.stroke();
    gx += w;
  }

  // Mid-header divider
  ctx.strokeStyle = colors.gridLine;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(gridLeft, headerTop + HEADER_HEIGHT / 2);
  ctx.lineTo(gridLeft + gridWidth, headerTop + HEADER_HEIGHT / 2);
  ctx.stroke();

  // ===== Unit labels (bottom half) =====
  ctx.font = `9px ${FONT}`;
  ctx.fillStyle = colors.textSecondary;
  units.forEach((unit, i) => {
    const x = gridLeft + i * colWidth;
    ctx.fillText(formatUnitLabel(unit, zoom), x + colWidth / 2, headerTop + HEADER_HEIGHT / 2 + 18);

    ctx.strokeStyle = colors.gridLineFine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, headerTop + HEADER_HEIGHT / 2);
    ctx.lineTo(x, headerTop + HEADER_HEIGHT);
    ctx.stroke();
  });
  ctx.textAlign = 'left';

  // Header bottom border
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox, headerTop + HEADER_HEIGHT);
  ctx.lineTo(ox + totalWidth - PADDING * 2, headerTop + HEADER_HEIGHT);
  ctx.stroke();

  // Task column header
  ctx.fillStyle = colors.textSecondary;
  ctx.font = `bold 9px ${FONT}`;
  ctx.fillText('TASK', ox + 8, headerTop + 18);

  // ===== Grid background =====
  units.forEach((unit, i) => {
    const x = gridLeft + i * colWidth;
    if (zoom === 'day' && isWeekend(unit)) {
      ctx.fillStyle = colors.headerBg;
      ctx.fillRect(x, bodyTop, colWidth, tasks.length * ROW_HEIGHT);
    }
    ctx.strokeStyle = colors.gridLineFine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, bodyTop);
    ctx.lineTo(x, bodyTop + tasks.length * ROW_HEIGHT);
    ctx.stroke();
  });

  // ===== Today line =====
  const todayX = gridLeft + dateToPixelOffset(new Date(), timelineStart, zoom);
  if (todayX > gridLeft && todayX < gridLeft + gridWidth) {
    ctx.strokeStyle = colors.todayText;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(todayX, headerTop);
    ctx.lineTo(todayX, bodyTop + tasks.length * ROW_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.todayText;
    ctx.font = `bold 8px ${FONT}`;
    ctx.fillText('Today', todayX + 3, headerTop + 10);
  }

  // ===== Rows: labels + bars =====
  tasks.forEach((task, i) => {
    const rowY = bodyTop + i * ROW_HEIGHT;

    // Row divider
    ctx.strokeStyle = colors.gridLineFine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(ox, rowY + ROW_HEIGHT);
    ctx.lineTo(ox + totalWidth - PADDING * 2, rowY + ROW_HEIGHT);
    ctx.stroke();

    // Alternating row bg
    if (i % 2 === 1) {
      ctx.fillStyle = colors.altRow;
      ctx.fillRect(ox, rowY, TASK_LABEL_WIDTH, ROW_HEIGHT);
    }

    const isSummary = task.type === 'summary';
    const isMilestone = task.type === 'milestone';
    const indent = task.parentId ? 16 : 0;

    // RAG dot
    if (task.rag !== 'none') {
      ctx.fillStyle = RAG_COLORS[task.rag];
      ctx.beginPath();
      ctx.arc(ox + 8 + indent, rowY + ROW_HEIGHT / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Task label
    ctx.fillStyle = colors.text;
    ctx.font = isSummary ? `bold 10px ${FONT}` : `10px ${FONT}`;
    const labelX = ox + (task.rag !== 'none' ? 18 : 8) + indent;
    const maxLabelWidth = TASK_LABEL_WIDTH - (labelX - ox) - 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(labelX, rowY, maxLabelWidth, ROW_HEIGHT);
    ctx.clip();
    ctx.fillText(task.title, labelX, rowY + ROW_HEIGHT / 2 + 3);
    ctx.restore();

    // ---- Bar ----
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    const barLeft = gridLeft + dateToPixelOffset(taskStart, timelineStart, zoom);
    const barRight = gridLeft + dateToPixelOffset(taskEnd, timelineStart, zoom);
    const barWidth = Math.max(barRight - barLeft, isMilestone ? 0 : 16);
    const barY = rowY + 6;
    const barH = ROW_HEIGHT - 12;

    if (isMilestone) {
      const cx = barLeft;
      const cy = rowY + ROW_HEIGHT / 2;
      const s = 8;
      ctx.fillStyle = task.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.fill();
    } else if (isSummary) {
      const sy = rowY + ROW_HEIGHT / 2 - 3;
      ctx.fillStyle = task.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(barLeft, sy, barWidth, 6);
      ctx.globalAlpha = 0.9;
      // Left bracket
      ctx.beginPath();
      ctx.moveTo(barLeft, sy - 2);
      ctx.lineTo(barLeft + 5, sy - 2);
      ctx.lineTo(barLeft, sy + 8);
      ctx.closePath();
      ctx.fill();
      // Right bracket
      ctx.beginPath();
      ctx.moveTo(barLeft + barWidth, sy - 2);
      ctx.lineTo(barLeft + barWidth - 5, sy - 2);
      ctx.lineTo(barLeft + barWidth, sy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Background
      ctx.fillStyle = task.color;
      ctx.globalAlpha = 0.2;
      roundRect(ctx, barLeft, barY, barWidth, barH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Progress
      if (task.percentComplete > 0) {
        ctx.fillStyle = task.color;
        ctx.globalAlpha = 0.5;
        roundRect(ctx, barLeft, barY, (barWidth * task.percentComplete) / 100, barH, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Border
      ctx.strokeStyle = task.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      roundRect(ctx, barLeft, barY, barWidth, barH, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Bar label
      if (barWidth > 50) {
        ctx.fillStyle = colors.text;
        ctx.font = `9px ${FONT}`;
        ctx.save();
        ctx.beginPath();
        ctx.rect(barLeft, barY, barWidth, barH);
        ctx.clip();
        ctx.fillText(task.title, barLeft + 5, barY + barH / 2 + 3);
        ctx.restore();
      }
    }
  });

  // ===== Dependency lines =====
  const taskIndexMap = new Map<string, number>();
  tasks.forEach((t, i) => taskIndexMap.set(t.id, i));
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.2;

  for (const dep of dependencies) {
    const pred = taskMap.get(dep.predecessorTaskId);
    const succ = taskMap.get(dep.successorTaskId);
    if (!pred || !succ) continue;
    const predIdx = taskIndexMap.get(dep.predecessorTaskId);
    const succIdx = taskIndexMap.get(dep.successorTaskId);
    if (predIdx === undefined || succIdx === undefined) continue;

    const barH = ROW_HEIGHT - 12;
    const predRect = {
      x: gridLeft + dateToPixelOffset(parseISO(pred.startDate), timelineStart, zoom),
      y: bodyTop + predIdx * ROW_HEIGHT + 6,
      width: Math.max(dateToPixelOffset(parseISO(pred.endDate), timelineStart, zoom) - dateToPixelOffset(parseISO(pred.startDate), timelineStart, zoom), 16),
      height: barH,
    };
    const succRect = {
      x: gridLeft + dateToPixelOffset(parseISO(succ.startDate), timelineStart, zoom),
      y: bodyTop + succIdx * ROW_HEIGHT + 6,
      width: Math.max(dateToPixelOffset(parseISO(succ.endDate), timelineStart, zoom) - dateToPixelOffset(parseISO(succ.startDate), timelineStart, zoom), 16),
      height: barH,
    };

    const pts = getDependencyPoints(dep.type, predRect, succRect);
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();

    const midX = (pts.x1 + pts.x2) / 2;
    if (dep.type === 'FS' || dep.type === 'SF') {
      if (pts.x2 > pts.x1 + 24) {
        ctx.moveTo(pts.x1, pts.y1);
        ctx.lineTo(midX, pts.y1);
        ctx.lineTo(midX, pts.y2);
        ctx.lineTo(pts.x2, pts.y2);
      } else {
        const midY = (pts.y1 + pts.y2) / 2;
        ctx.moveTo(pts.x1, pts.y1);
        ctx.lineTo(pts.x1 + 12, pts.y1);
        ctx.lineTo(pts.x1 + 12, midY);
        ctx.lineTo(pts.x2 - 12, midY);
        ctx.lineTo(pts.x2 - 12, pts.y2);
        ctx.lineTo(pts.x2, pts.y2);
      }
    } else {
      const leftX = Math.min(pts.x1, pts.x2) - 12;
      ctx.moveTo(pts.x1, pts.y1);
      ctx.lineTo(leftX, pts.y1);
      ctx.lineTo(leftX, pts.y2);
      ctx.lineTo(pts.x2, pts.y2);
    }
    ctx.stroke();

    // Arrowhead
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(pts.x2, pts.y2);
    ctx.lineTo(pts.x2 - 6, pts.y2 - 3);
    ctx.lineTo(pts.x2 - 6, pts.y2 + 3);
    ctx.closePath();
    ctx.fill();
    ctx.setLineDash([4, 3]);
  }
  ctx.setLineDash([]);

  // ===== Sticky notes =====
  const NOTE_W = 120;
  const NOTE_H = 52;
  for (const note of stickyNotes) {
    const task = taskMap.get(note.taskId);
    const rowIdx = taskIndexMap.get(note.taskId);
    if (!task || rowIdx === undefined) continue;

    // Task bar geometry
    const taskStartPx = gridLeft + dateToPixelOffset(parseISO(task.startDate), timelineStart, zoom);
    const taskEndPx = gridLeft + dateToPixelOffset(parseISO(task.endDate), timelineStart, zoom);
    const taskCenterX = (taskStartPx + taskEndPx) / 2;
    const taskCenterY = bodyTop + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Compute bar bounding rect for border intersection
    let barRect: { x: number; y: number; w: number; h: number };
    if (task.type === 'milestone') {
      const s = 8;
      barRect = { x: taskStartPx - s, y: taskCenterY - s, w: s * 2, h: s * 2 };
    } else if (task.type === 'summary') {
      const bw = Math.max(taskEndPx - taskStartPx, 16);
      barRect = { x: taskStartPx, y: taskCenterY - 5, w: bw, h: 10 };
    } else {
      const bw = Math.max(taskEndPx - taskStartPx, 16);
      const barH = ROW_HEIGHT - 12;
      barRect = { x: taskStartPx, y: bodyTop + rowIdx * ROW_HEIGHT + 6, w: bw, h: barH };
    }

    // Note position
    const noteX = taskCenterX + note.offsetX;
    const noteY = taskCenterY + note.offsetY;

    // Arrow line from note to task bar border
    const noteAnchorX = noteX + NOTE_W / 2;
    const isAbove = noteY < taskCenterY;
    const noteAnchorY = isAbove ? noteY + NOTE_H : noteY;

    // Find intersection with bar border
    const bcx = barRect.x + barRect.w / 2;
    const bcy = barRect.y + barRect.h / 2;
    const dx = noteAnchorX - bcx;
    const dy = noteAnchorY - bcy;
    let borderX = bcx, borderY = bcy;
    if (dx !== 0 || dy !== 0) {
      const hw = barRect.w / 2;
      const hh = barRect.h / 2;
      const t = Math.abs(dx) * hh > Math.abs(dy) * hw ? hw / Math.abs(dx) : hh / Math.abs(dy);
      borderX = bcx + dx * t;
      borderY = bcy + dy * t;
    }

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(noteAnchorX, noteAnchorY);
    ctx.lineTo(borderX, borderY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead at bar border
    const angle = Math.atan2(borderY - noteAnchorY, borderX - noteAnchorX);
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(borderX, borderY);
    ctx.lineTo(borderX - 6 * Math.cos(angle - 0.4), borderY - 6 * Math.sin(angle - 0.4));
    ctx.lineTo(borderX - 6 * Math.cos(angle + 0.4), borderY - 6 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    // Note background
    ctx.fillStyle = note.color;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    roundRect(ctx, noteX, noteY, NOTE_W, NOTE_H, 3);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Note border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    roundRect(ctx, noteX, noteY, NOTE_W, NOTE_H, 3);
    ctx.stroke();

    // Note text
    if (note.text) {
      ctx.fillStyle = colors.text;
      ctx.font = `9px ${FONT}`;
      const lines = note.text.split('\n');
      const maxLines = 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(noteX + 4, noteY + 4, NOTE_W - 8, NOTE_H - 8);
      ctx.clip();
      for (let li = 0; li < Math.min(lines.length, maxLines); li++) {
        ctx.fillText(lines[li], noteX + 6, noteY + 14 + li * 11);
      }
      ctx.restore();
    }
  }

  // ===== Outer border =====
  ctx.strokeStyle = colors.gridLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, headerTop, totalWidth - PADDING * 2, HEADER_HEIGHT + tasks.length * ROW_HEIGHT);

  // Vertical divider between labels and grid
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gridLeft, headerTop);
  ctx.lineTo(gridLeft, bodyTop + tasks.length * ROW_HEIGHT);
  ctx.stroke();

  return canvas;
}

export function exportPNG(opts: ExportOptions): void {
  const canvas = renderToCanvas(opts);
  const link = document.createElement('a');
  link.download = `${opts.project.name.replace(/\s+/g, '-').toLowerCase()}-timeline-${format(new Date(), 'yyyy-MM-dd')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function exportPDF(opts: ExportOptions): void {
  const canvas = renderToCanvas(opts);
  const imgData = canvas.toDataURL('image/png');
  const w = canvas.width / 2;
  const h = canvas.height / 2;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [w, h],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, w, h);
  pdf.save(`${opts.project.name.replace(/\s+/g, '-').toLowerCase()}-timeline-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportCSV(
  tasks: Task[],
  customFields: CustomFieldDefinition[],
  customFieldValues: CustomFieldValue[]
): void {
  const headers = [
    'Title',
    'Type',
    'Start Date',
    'End Date',
    'Duration',
    'Owner',
    'Status',
    'RAG',
    '% Complete',
    'Tags',
    'Notes',
    ...customFields.map((f) => f.name),
  ];

  const rows = tasks.map((task) => {
    const cfValues = customFields.map((field) => {
      const val = customFieldValues.find(
        (v) => v.taskId === task.id && v.fieldDefinitionId === field.id
      );
      return val?.value || '';
    });

    return [
      task.title,
      task.type,
      task.startDate,
      task.endDate,
      String(task.duration),
      task.ownerText,
      task.status,
      task.rag,
      String(task.percentComplete),
      task.tags.join('; '),
      task.notes.replace(/\n/g, ' '),
      ...cfValues,
    ];
  });

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent =
    [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join(
      '\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = `timeline-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}
