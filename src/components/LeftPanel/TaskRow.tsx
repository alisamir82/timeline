import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Diamond,
  FolderOpen,
  GripVertical,
  MessageSquare,
} from 'lucide-react';
import type { Task, RAGStatus } from '../../types';
import { RAG_COLORS } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { ROW_HEIGHT } from '../../utils/dates';

interface TaskRowProps {
  task: Task;
  depth: number;
}

function RAGBadge({ rag }: { rag: RAGStatus }) {
  if (rag === 'none') return <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />;
  return (
    <span
      className="w-3 h-3 rounded-full inline-block"
      style={{ backgroundColor: RAG_COLORS[rag] }}
      title={rag.toUpperCase()}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Not Started': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'On Hold': 'bg-yellow-100 text-yellow-700',
    Complete: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-600',
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${colors[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

export default function TaskRow({ task, depth }: TaskRowProps) {
  const {
    selectedTaskId,
    hoveredTaskId,
    selectTask,
    openTaskDetails,
    toggleCollapse,
    setHoveredTask,
  } = useProjectStore();

  const isSelected = selectedTaskId === task.id;
  const isHovered = hoveredTaskId === task.id;
  const isSummary = task.type === 'summary';
  const isMilestone = task.type === 'milestone';

  return (
    <div
      className={`flex items-center border-b border-gray-100 cursor-pointer select-none group
        ${isSelected ? 'bg-blue-50' : isHovered ? 'bg-gray-50' : 'bg-white'}
      `}
      style={{ height: ROW_HEIGHT, paddingLeft: depth * 20 + 4 }}
      onClick={() => selectTask(task.id)}
      onDoubleClick={() => openTaskDetails(task.id)}
      onMouseEnter={() => setHoveredTask(task.id)}
      onMouseLeave={() => setHoveredTask(null)}
    >
      {/* Drag handle */}
      <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 mr-1 flex-shrink-0" />

      {/* Expand/collapse for summary */}
      {isSummary ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse(task.id);
          }}
          className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
        >
          {task.collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
      ) : (
        <span className="w-5 flex-shrink-0" />
      )}

      {/* Icon */}
      <span className="mr-1.5 flex-shrink-0">
        {isMilestone ? (
          <Diamond className="w-3.5 h-3.5 text-purple-500" />
        ) : isSummary ? (
          <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ backgroundColor: task.color }}
          />
        )}
      </span>

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate mr-2 ${isSummary ? 'font-semibold' : ''}`}
        title={task.title}
      >
        {task.title}
      </span>

      {/* Notes indicator */}
      {task.notes && (
        <MessageSquare className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
      )}

      {/* Owner */}
      <span className="w-20 text-xs text-gray-500 truncate mr-2 flex-shrink-0" title={task.ownerText}>
        {task.ownerText}
      </span>

      {/* Status */}
      <span className="w-20 flex-shrink-0 mr-2">
        <StatusBadge status={task.status} />
      </span>

      {/* RAG */}
      <span className="w-5 flex-shrink-0 flex justify-center">
        <RAGBadge rag={task.rag} />
      </span>

      {/* % Complete */}
      <span className="w-10 text-[10px] text-gray-400 text-right flex-shrink-0 pr-2">
        {task.percentComplete > 0 ? `${task.percentComplete}%` : ''}
      </span>
    </div>
  );
}
