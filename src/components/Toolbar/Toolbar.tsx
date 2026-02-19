import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Calendar,
  Filter,
  Download,
  Plus,
  Undo2,
  Redo2,
  Settings,
  History,
} from 'lucide-react';
import type { ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';

interface ToolbarProps {
  onToggleFilters: () => void;
  onToggleAuditLog: () => void;
  onExport: (format: 'png' | 'pdf' | 'csv') => void;
  filtersVisible: boolean;
}

const ZOOM_LEVELS: ZoomLevel[] = ['day', 'week', 'month', 'quarter'];
const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
};

export default function Toolbar({
  onToggleFilters,
  onToggleAuditLog,
  onExport,
  filtersVisible,
}: ToolbarProps) {
  const { project, zoom, setZoom, addTask } = useProjectStore();

  const currentIndex = ZOOM_LEVELS.indexOf(zoom);

  const zoomIn = () => {
    if (currentIndex > 0) setZoom(ZOOM_LEVELS[currentIndex - 1]);
  };

  const zoomOut = () => {
    if (currentIndex < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[currentIndex + 1]);
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      {/* Project name */}
      <h1 className="text-base font-semibold text-gray-800 mr-4 truncate max-w-48">
        {project.name}
      </h1>

      <div className="h-6 w-px bg-gray-200" />

      {/* Add task */}
      <button
        onClick={() => addTask({})}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Task
      </button>

      <div className="h-6 w-px bg-gray-200" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={zoomIn}
          disabled={currentIndex === 0}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>

        <div className="flex bg-gray-100 rounded p-0.5">
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                zoom === z
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>

        <button
          onClick={zoomOut}
          disabled={currentIndex === ZOOM_LEVELS.length - 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Today button */}
      <button
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-100"
        title="Jump to today"
      >
        <Calendar className="w-3.5 h-3.5" />
        Today
      </button>

      <div className="flex-1" />

      {/* Filter toggle */}
      <button
        onClick={onToggleFilters}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
          filtersVisible
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
      </button>

      {/* Audit log */}
      <button
        onClick={onToggleAuditLog}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-100"
        title="Activity log"
      >
        <History className="w-3.5 h-3.5" />
        Log
      </button>

      {/* Export */}
      <div className="relative group">
        <button className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-100">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-30">
          <button
            onClick={() => onExport('png')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            Export PNG
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            Export PDF
          </button>
          <button
            onClick={() => onExport('csv')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
