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
  Moon,
  Sun,
  HardDriveDownload,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { ZoomLevel } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';

interface ToolbarProps {
  onToggleFilters: () => void;
  onToggleAuditLog: () => void;
  onExport: (format: 'png' | 'pdf' | 'csv') => void;
  onProjectClick: () => void;
  onSave: () => void;
  onSaveAs: () => void;
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
  onSaveAs,
  onLoad,
  filtersVisible,
}: ToolbarProps) {
  const { project, zoom, setZoom, addTask, addNoteMode, setAddNoteMode, theme, toggleTheme, autoSave, setAutoSave } = useProjectStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);

  const currentIndex = ZOOM_LEVELS.indexOf(zoom);

  const zoomIn = () => {
    if (currentIndex > 0) setZoom(ZOOM_LEVELS[currentIndex - 1]);
  };

  const zoomOut = () => {
    if (currentIndex < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[currentIndex + 1]);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) {
        setSaveOpen(false);
      }
    };
    if (exportOpen || saveOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen, saveOpen]);

  return (
    <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
      {/* Project name - clickable */}
      <button
        onClick={onProjectClick}
        className="flex items-center gap-1.5 text-base font-semibold text-gray-800 dark:text-gray-100 mr-2 truncate max-w-56 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors"
        title="Manage projects"
      >
        <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="truncate">{project.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

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
            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-600'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={addNoteMode ? 'Cancel adding note' : 'Add a sticky note to a task'}
      >
        <StickyNote className="w-3.5 h-3.5" />
        Note
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={zoomIn}
          disabled={currentIndex === 0}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-0.5">
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                zoom === z
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>

        <button
          onClick={zoomOut}
          disabled={currentIndex === ZOOM_LEVELS.length - 1}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Today button */}
      <button
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Jump to today"
      >
        <Calendar className="w-3.5 h-3.5" />
        Today
      </button>

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <Moon className="w-4 h-4 text-gray-600" />
        ) : (
          <Sun className="w-4 h-4 text-yellow-400" />
        )}
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Save dropdown */}
      <div className="relative" ref={saveRef}>
        <button
          onClick={() => setSaveOpen(!saveOpen)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Save project"
        >
          <Save className="w-3.5 h-3.5" />
          Save
          <ChevronDown className="w-3 h-3" />
        </button>
        {saveOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 py-1 min-w-48">
            <button
              onClick={() => { onSave(); setSaveOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              Save
              <span className="ml-auto text-[10px] text-gray-400">Ctrl+S</span>
            </button>
            <button
              onClick={() => { onSaveAs(); setSaveOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              Save As...
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button
              onClick={() => { onLoad(); setSaveOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Open File...
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <div
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setAutoSave(!autoSave)}
            >
              {autoSave ? (
                <ToggleRight className="w-4 h-4 text-blue-500" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-gray-400" />
              )}
              Auto-save
              <span className={`ml-auto text-[10px] ${autoSave ? 'text-blue-500' : 'text-gray-400'}`}>
                {autoSave ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Filter toggle */}
      <button
        onClick={onToggleFilters}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
          filtersVisible
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
      </button>

      {/* Audit log */}
      <button
        onClick={onToggleAuditLog}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Activity log"
      >
        <History className="w-3.5 h-3.5" />
        Log
      </button>

      {/* Export - click-based dropdown */}
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen(!exportOpen)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Download className="w-3.5 h-3.5" />
          Export
          <ChevronDown className="w-3 h-3" />
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 py-1 min-w-36">
            <button
              onClick={() => { onExport('png'); setExportOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              Export PNG
            </button>
            <button
              onClick={() => { onExport('pdf'); setExportOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              Export PDF
            </button>
            <button
              onClick={() => { onExport('csv'); setExportOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
