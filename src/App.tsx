import React, { useState, useRef, useCallback, useEffect } from 'react';
import LeftPanel from './components/LeftPanel/LeftPanel';
import TimelineGrid from './components/Timeline/TimelineGrid';
import TaskDetailsDrawer from './components/TaskDetails/TaskDetailsDrawer';
import Toolbar from './components/Toolbar/Toolbar';
import FilterPanel from './components/Filters/FilterPanel';
import AuditLogPanel from './components/AuditLog/AuditLogPanel';
import ProjectModal from './components/ProjectManager/ProjectModal';
import { useProjectStore } from './stores/useProjectStore';
import { exportPNG, exportPDF, exportCSV } from './components/Export/exportUtils';
import { LEFT_PANEL_DEFAULT_WIDTH } from './utils/dates';
import { CORPORATE_COLORS } from './types';

// File System Access API types
interface FileSystemWritableFileStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}
interface FSFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
  name: string;
}

export default function App() {
  const {
    project, tasks, dependencies, stickyNotes, customFields, customFieldValues,
    zoom, showTaskDetails, currentUser, theme, autoSave, isDirty, lastSavedAt,
    exportAllData, importAllData, markSaved,
  } = useProjectStore();

  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH);
  const [scrollTop, setScrollTop] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileHandleRef = useRef<FSFileHandle | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('corporate', theme === 'corporate');
  }, [theme]);

  // Auto-save to localStorage
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (autoSave) {
      autoSaveTimerRef.current = setInterval(() => {
        const state = useProjectStore.getState();
        if (state.isDirty) {
          const json = state.exportAllData();
          localStorage.setItem('timeline-autosave-data', json);
          state.markSaved();

          // Also save to file handle if available
          if (fileHandleRef.current) {
            writeToFileHandle(fileHandleRef.current, json);
          }
        }
      }, 30000); // every 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSave]);

  // Load auto-saved data on startup, or persist the default project
  useEffect(() => {
    const saved = localStorage.getItem('timeline-autosave-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.projects && data.projects.length > 0) {
          importAllData(saved);
        }
      } catch {
        // ignore
      }
    } else {
      // Save the default project to localStorage on first load
      const json = useProjectStore.getState().exportAllData();
      localStorage.setItem('timeline-autosave-data', json);
    }
  }, []);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function writeToFileHandle(handle: FSFileHandle, json: string) {
    try {
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    } catch {
      // Permission revoked or file access lost - clear handle
      fileHandleRef.current = null;
    }
  }

  // Save: write to existing file handle, or fall back to Save As
  const handleSave = useCallback(async () => {
    const json = exportAllData();

    // Try File System Access API if we have a handle
    if (fileHandleRef.current) {
      await writeToFileHandle(fileHandleRef.current, json);
      markSaved();
      localStorage.setItem('timeline-autosave-data', json);
      return;
    }

    // Try to get a new handle via Save As
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${project.name.replace(/\s+/g, '-').toLowerCase()}-timeline.json`,
          types: [{
            description: 'Timeline Project',
            accept: { 'application/json': ['.json'] },
          }],
        });
        fileHandleRef.current = handle;
        await writeToFileHandle(handle, json);
        markSaved();
        localStorage.setItem('timeline-autosave-data', json);
        return;
      } catch {
        // User cancelled - fall through to download
      }
    }

    // Fallback: download
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-timeline.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    markSaved();
    localStorage.setItem('timeline-autosave-data', json);
  }, [exportAllData, markSaved, project.name]);

  // Save As: always prompt for new file location
  const handleSaveAs = useCallback(async () => {
    const json = exportAllData();

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${project.name.replace(/\s+/g, '-').toLowerCase()}-timeline.json`,
          types: [{
            description: 'Timeline Project',
            accept: { 'application/json': ['.json'] },
          }],
        });
        fileHandleRef.current = handle;
        await writeToFileHandle(handle, json);
        markSaved();
        localStorage.setItem('timeline-autosave-data', json);
        return;
      } catch {
        // User cancelled
        return;
      }
    }

    // Fallback: download
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-timeline.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    markSaved();
    localStorage.setItem('timeline-autosave-data', json);
  }, [exportAllData, markSaved, project.name]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const success = importAllData(text);
        if (!success) {
          alert('Failed to load file. Please check the file format.');
        } else {
          localStorage.setItem('timeline-autosave-data', text);
          markSaved();
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importAllData, markSaved]
  );

  // After project creation, prompt to save
  const handleProjectCreated = useCallback(() => {
    setShowProjectModal(false);
    // Small delay so the store updates before we export
    setTimeout(() => {
      handleSaveAs();
    }, 100);
  }, [handleSaveAs]);

  const handleExport = useCallback(
    (fmt: 'png' | 'pdf' | 'csv') => {
      if (fmt === 'csv') {
        exportCSV(tasks, customFields, customFieldValues);
        return;
      }
      const dark = theme === 'dark';
      const opts = { project, tasks, dependencies, stickyNotes, zoom, dark };
      if (fmt === 'png') {
        exportPNG(opts);
      } else {
        exportPDF(opts);
      }
    },
    [project, tasks, dependencies, stickyNotes, zoom, customFields, customFieldValues, theme]
  );

  const lastSavedLabel = lastSavedAt
    ? `Last saved: ${new Date(lastSavedAt).toLocaleTimeString()}`
    : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-gray-900">

      {/* Hidden file input for loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileLoad}
      />

      {/* Top toolbar */}
      <Toolbar
        onToggleFilters={() => setShowFilters((v) => !v)}
        onToggleAuditLog={() => setShowAuditLog((v) => !v)}
        onExport={handleExport}
        onProjectClick={() => setShowProjectModal(true)}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onLoad={handleLoad}
        filtersVisible={showFilters}
      />

      {/* Filter panel (collapsible) */}
      {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: task list */}
        <LeftPanel
          width={leftPanelWidth}
          onResize={setLeftPanelWidth}
          scrollTop={scrollTop}
          onScroll={setScrollTop}
        />

        {/* Right panel: timeline grid */}
        <TimelineGrid scrollTop={scrollTop} onScroll={setScrollTop} />

        {/* Task details drawer */}
        {showTaskDetails && <TaskDetailsDrawer />}
      </div>

      {/* Audit log overlay */}
      {showAuditLog && <AuditLogPanel onClose={() => setShowAuditLog(false)} />}

      {/* Project modal */}
      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {/* Status bar */}
      <div
        className="h-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center px-4 text-[10px] text-gray-400 gap-4"
        style={theme === 'corporate' ? { backgroundColor: CORPORATE_COLORS.barBg, borderColor: CORPORATE_COLORS.barBorder, color: CORPORATE_COLORS.barTextMuted } : undefined}
      >
        <span>{tasks.length} tasks</span>
        <span>Logged in as: {currentUser.name} ({currentUser.role})</span>
        {autoSave && <span className="text-blue-500">Auto-save ON</span>}
        {lastSavedLabel && <span>{lastSavedLabel}</span>}
        {isDirty && <span className="text-amber-500">Unsaved changes</span>}
      </div>
    </div>
  );
}
