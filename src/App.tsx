import React, { useState, useRef, useCallback } from 'react';
import LeftPanel from './components/LeftPanel/LeftPanel';
import TimelineGrid from './components/Timeline/TimelineGrid';
import TaskDetailsDrawer from './components/TaskDetails/TaskDetailsDrawer';
import Toolbar from './components/Toolbar/Toolbar';
import FilterPanel from './components/Filters/FilterPanel';
import AuditLogPanel from './components/AuditLog/AuditLogPanel';
import { useProjectStore } from './stores/useProjectStore';
import { exportPNG, exportPDF, exportCSV } from './components/Export/exportUtils';
import { LEFT_PANEL_DEFAULT_WIDTH } from './utils/dates';

export default function App() {
  const { tasks, customFields, customFieldValues, showTaskDetails, currentUser } = useProjectStore();
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH);
  const [scrollTop, setScrollTop] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top toolbar */}
      <Toolbar
        onToggleFilters={() => setShowFilters((v) => !v)}
        onToggleAuditLog={() => setShowAuditLog((v) => !v)}
        onExport={handleExport}
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

      {/* Status bar */}
      <div className="h-6 bg-gray-50 border-t border-gray-200 flex items-center px-4 text-[10px] text-gray-400 gap-4">
        <span>{tasks.length} tasks</span>
        <span>Logged in as: {currentUser.name} ({currentUser.role})</span>
      </div>
    </div>
  );
}
