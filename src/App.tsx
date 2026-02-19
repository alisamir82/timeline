import React, { useState, useRef, useCallback } from 'react';
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

export default function App() {
  const { tasks, customFields, customFieldValues, showTaskDetails, currentUser, exportAllData, importAllData } =
    useProjectStore();
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH);
  const [scrollTop, setScrollTop] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(
    async (format: 'png' | 'pdf' | 'csv') => {
      if (format === 'csv') {
        exportCSV(tasks, customFields, customFieldValues);
        return;
      }
      const el = timelineRef.current;
      if (!el) return;
      if (format === 'png') {
        await exportPNG(el);
      } else {
        await exportPDF(el);
      }
    },
    [tasks, customFields, customFieldValues]
  );

  const handleSave = useCallback(() => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `timeline-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [exportAllData]);

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
        }
      };
      reader.readAsText(file);
      // Reset so the same file can be loaded again
      e.target.value = '';
    },
    [importAllData]
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
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
        onLoad={handleLoad}
        filtersVisible={showFilters}
      />

      {/* Filter panel (collapsible) */}
      {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}

      {/* Main content */}
      <div ref={timelineRef} className="flex-1 flex overflow-hidden">
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
      {showProjectModal && <ProjectModal onClose={() => setShowProjectModal(false)} />}

      {/* Status bar */}
      <div className="h-6 bg-gray-50 border-t border-gray-200 flex items-center px-4 text-[10px] text-gray-400 gap-4">
        <span>{tasks.length} tasks</span>
        <span>Logged in as: {currentUser.name} ({currentUser.role})</span>
      </div>
    </div>
  );
}
