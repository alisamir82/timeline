import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Calendar,
  Filter,
  Download,
  Plus,
  History,
  ChevronDown,
  Save,
  Upload,
  FolderOpen,
  StickyNote,
} from 'lucide-react';
import type { ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';

interface ToolbarProps {
  onToggleFilters: () => void;
  onToggleAuditLog: () => void;
  onExport: (format: 'png' | 'pdf' | 'csv') => void;
  onProjectClick: () => void;
  onSave: () => void;
  onLoad: () => void;
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
  onProjectClick,
  onSave,
  onLoad,
  filtersVisible,
}: ToolbarProps) {
  const { project, zoom, setZoom, addTask, addNoteMode, setAddNoteMode } = useProjectStore();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const currentIndex = ZOOM_LEVELS.indexOf(zoom);

  const zoomIn = () => {
    if (currentIndex > 0) setZoom(ZOOM_LEVELS[currentIndex - 1]);
  };

  const zoomOut = () => {
    if (currentIndex < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[currentIndex + 1]);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
      {/* Project name - clickable */}
      <button
        onClick={onProjectClick}
        className="flex items-center gap-1.5 text-base font-semibold text-gray-800 mr-2 truncate max-w-56 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
        title="Manage projects"
      >
        <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="truncate">{project.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      <div className="h-6 w-px bg-gray-200" />

      {/* Add task */}
      <button
        onClick={() => addTask({})}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Task
      </button>

      {/* Add note */}
      <button
        onClick={() => setAddNoteMode(!addNoteMode)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded transition-colors ${
          addNoteMode
            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        title={addNoteMode ? 'Cancel adding note' : 'Add a sticky note to a task'}
      >
        <StickyNote className="w-3.5 h-3.5" />
        Note
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

      {/* Save / Load */}
      <button
        onClick={onSave}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-100"
        title="Save to file"
      >
        <Save className="w-3.5 h-3.5" />
        Save
      </button>
      <button
        onClick={onLoad}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-100"
        title="Load from file"
      >
        <Upload className="w-3.5 h-3.5" />
        Load
      </button>

      <div className="h-6 w-px bg-gray-200" />

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

      {/* Export - click-based dropdown */}
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen(!exportOpen)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 rounded hover:bg-gray-100"
        >
          <Download className="w-3.5 h-3.5" />
          Export
          <ChevronDown className="w-3 h-3" />
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-36">
            <button
              onClick={() => { onExport('png'); setExportOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Export PNG
            </button>
            <button
              onClick={() => { onExport('pdf'); setExportOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Export PDF
            </button>
            <button
              onClick={() => { onExport('csv'); setExportOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
