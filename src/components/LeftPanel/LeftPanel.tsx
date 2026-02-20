import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import TaskRow from './TaskRow';
import { HEADER_HEIGHT, ROW_HEIGHT, COLUMN_HEADER_HEIGHT, QUALITY_GATE_BAR_HEIGHT } from '../../utils/dates';

interface LeftPanelProps {
  width: number;
  onResize: (newWidth: number) => void;
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
}

export default function LeftPanel({ width, onResize, scrollTop, onScroll }: LeftPanelProps) {
  const { getVisibleTasks, getQualityGates, tasks, addTask, reorderTask, filters, setFilters } = useProjectStore();
  const visibleTasks = getVisibleTasks();
  const hasGates = getQualityGates().length > 0;
  const listRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const isScrollingSelf = useRef(false);

  // Drag-to-reorder state
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragFromIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
      const task = visibleTasks[dragFromIndex];
      if (task) {
        reorderTask(task.id, dragOverIndex);
      }
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  }, [dragFromIndex, dragOverIndex, visibleTasks, reorderTask]);

  // Sync scroll position from timeline
  useEffect(() => {
    if (listRef.current && !isScrollingSelf.current) {
      listRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startWidth: width };
    const handleMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = me.clientX - resizeRef.current.startX;
      onResize(Math.max(280, Math.min(700, resizeRef.current.startWidth + delta)));
    };
    const handleUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  function getDepth(task: { parentId: string | null }): number {
    if (!task.parentId) return 0;
    const parent = tasks.find((t) => t.id === task.parentId);
    return parent ? 1 + getDepth(parent) : 0;
  }

  return (
    <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 relative" style={{ width }}>
      {/* Header */}
      <div
        className="flex items-center px-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 gap-2 flex-shrink-0"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex-1 flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1">
          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mr-1.5" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="text-sm w-full outline-none bg-transparent dark:text-gray-100"
            value={filters.searchText}
            onChange={(e) => setFilters({ searchText: e.target.value })}
          />
        </div>
        <button
          onClick={() => addTask({})}
          className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0"
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Column headers — expands when quality gates exist */}
      <div
        className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0"
        style={{ height: COLUMN_HEADER_HEIGHT + (hasGates ? QUALITY_GATE_BAR_HEIGHT : 0) }}
      >
        <div className="flex items-center px-3 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ height: COLUMN_HEADER_HEIGHT }}>
          <span className="flex-1 pl-8">Task</span>
          <span className="w-20 mr-2">Owner</span>
          <span className="w-20 mr-2">Status</span>
          <span className="w-5 text-center">RAG</span>
          <span className="w-10 text-right pr-2">%</span>
        </div>
        {hasGates && (
          <div className="flex items-center px-3 flex-1">
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Quality Gates</span>
          </div>
        )}
      </div>

      {/* Task list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={(e) => {
          isScrollingSelf.current = true;
          onScroll((e.target as HTMLElement).scrollTop);
          requestAnimationFrame(() => { isScrollingSelf.current = false; });
        }}
      >
        <div style={{ transform: `translateY(0px)` }}>
          {visibleTasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              depth={getDepth(task)}
              index={i}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverIndex === i && dragFromIndex !== i}
              isDragging={dragFromIndex === i}
            />
          ))}
        </div>
        {visibleTasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
            No tasks found
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors z-10"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
