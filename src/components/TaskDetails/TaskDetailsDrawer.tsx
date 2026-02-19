import React, { useState } from 'react';
import {
  X,
  Trash2,
  Link,
  Diamond,
  ChevronDown,
  Plus,
} from 'lucide-react';
import type { Task, RAGStatus, DependencyType } from '../../types';
import { DEFAULT_STATUSES, DEFAULT_COLORS, RAG_COLORS, DEPENDENCY_TYPE_LABELS } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';

function TagsEditor({ task, onUpdate }: { task: Task; onUpdate: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const { tasks } = useProjectStore();
  const allTags = [...new Set(tasks.flatMap((t) => t.tags))].sort();
  const suggestions = allTags.filter((t) => !task.tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()));

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !task.tags.includes(trimmed)) {
      onUpdate([...task.tags, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</label>
      <div className="flex flex-wrap gap-1 mt-1">
        {task.tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full group">
            {tag}
            <button
              onClick={() => onUpdate(task.tags.filter((_, idx) => idx !== i))}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              addTag(input);
            }
          }}
          className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-xs"
          placeholder="Add tag..."
          list="tag-suggestions"
        />
        <button
          onClick={() => addTag(input)}
          disabled={!input.trim()}
          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {input && suggestions.length > 0 && (
        <div className="mt-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shadow-sm max-h-24 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => addTag(s)}
              className="block w-full text-left px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskDetailsDrawer() {
  const {
    selectedTaskId,
    showTaskDetails,
    tasks,
    dependencies,
    users,
    customFields,
    customFieldValues,
    closeTaskDetails,
    updateTask,
    deleteTask,
    addDependency,
    deleteDependency,
    updateCustomFieldValue,
    getCustomFieldValuesForTask,
  } = useProjectStore();

  const [depFormOpen, setDepFormOpen] = useState(false);
  const [depPredecessor, setDepPredecessor] = useState('');
  const [depType, setDepType] = useState<DependencyType>('FS');

  const task = tasks.find((t) => t.id === selectedTaskId);

  if (!showTaskDetails || !task) return null;

  const taskDeps = dependencies.filter(
    (d) => d.predecessorTaskId === task.id || d.successorTaskId === task.id
  );
  const fieldValues = getCustomFieldValuesForTask(task.id);

  const handleFieldChange = (field: string, value: unknown) => {
    updateTask(task.id, { [field]: value });
  };

  const handleAddDependency = () => {
    if (depPredecessor && depPredecessor !== task.id) {
      addDependency(depPredecessor, task.id, depType);
      setDepFormOpen(false);
      setDepPredecessor('');
    }
  };

  return (
    <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          {task.type === 'milestone' && <Diamond className="w-4 h-4 text-purple-500" />}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Task Details</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm('Delete this task?')) {
                deleteTask(task.id);
                closeTaskDetails();
              }
            }}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 dark:text-gray-500 hover:text-red-500"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={closeTaskDetails}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 dark:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Title
          </label>
          <input
            type="text"
            value={task.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Type
          </label>
          <select
            value={task.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
            <option value="summary">Summary</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="date"
              value={task.startDate}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              End Date
            </label>
            <input
              type="date"
              value={task.endDate}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Duration display */}
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Duration: {task.duration} day{task.duration !== 1 ? 's' : ''}
        </div>

        {/* Owner */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Owner
          </label>
          <select
            value={task.ownerUserId || ''}
            onChange={(e) => {
              const user = users.find((u) => u.id === e.target.value);
              handleFieldChange('ownerUserId', e.target.value || null);
              handleFieldChange('ownerText', user?.name || '');
            }}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Status
          </label>
          <select
            value={task.status}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {DEFAULT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* RAG */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            RAG Status
          </label>
          <div className="flex gap-2 mt-1">
            {(['none', 'green', 'amber', 'red'] as RAGStatus[]).map((rag) => (
              <button
                key={rag}
                onClick={() => handleFieldChange('rag', rag)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                  task.rag === rag ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: RAG_COLORS[rag] }}
                title={rag === 'none' ? 'None' : rag.toUpperCase()}
              >
                {rag === 'none' ? '-' : rag[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* % Complete */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Progress ({task.percentComplete}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={task.percentComplete}
            onChange={(e) => handleFieldChange('percentComplete', Number(e.target.value))}
            className="w-full mt-1"
          />
        </div>

        {/* Color */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Color
          </label>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleFieldChange('color', c)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  task.color === c ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Notes
          </label>
          <textarea
            value={task.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            rows={3}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            placeholder="Add notes..."
          />
        </div>

        {/* Tags - editable */}
        <TagsEditor task={task} onUpdate={(tags) => handleFieldChange('tags', tags)} />

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div>
            <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Custom Fields
            </h3>
            <div className="space-y-2">
              {customFields.map((field) => {
                const val = fieldValues.find((v) => v.fieldDefinitionId === field.id);
                return (
                  <div key={field.id}>
                    <label className="text-xs text-gray-500 dark:text-gray-400">{field.name}</label>
                    {field.fieldType === 'dropdown' ? (
                      <select
                        value={val?.value || ''}
                        onChange={(e) => updateCustomFieldValue(task.id, field.id, e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">--</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.fieldType === 'boolean' ? (
                      <label className="flex items-center gap-2 mt-0.5">
                        <input
                          type="checkbox"
                          checked={val?.value === 'true'}
                          onChange={(e) =>
                            updateCustomFieldValue(task.id, field.id, String(e.target.checked))
                          }
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{field.name}</span>
                      </label>
                    ) : (
                      <input
                        type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : field.fieldType === 'url' ? 'url' : 'text'}
                        value={val?.value || ''}
                        onChange={(e) => updateCustomFieldValue(task.id, field.id, e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                        placeholder={`Enter ${field.name.toLowerCase()}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dependencies */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Dependencies
            </h3>
            <button
              onClick={() => setDepFormOpen(!depFormOpen)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              + Add
            </button>
          </div>

          {depFormOpen && (
            <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 space-y-2">
              <select
                value={depPredecessor}
                onChange={(e) => setDepPredecessor(e.target.value)}
                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Select predecessor...</option>
                {tasks
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
              <select
                value={depType}
                onChange={(e) => setDepType(e.target.value as DependencyType)}
                className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                {(Object.entries(DEPENDENCY_TYPE_LABELS) as [DependencyType, string][]).map(
                  ([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  )
                )}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAddDependency}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setDepFormOpen(false)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {taskDeps.map((dep) => {
              const isPred = dep.predecessorTaskId === task.id;
              const otherId = isPred ? dep.successorTaskId : dep.predecessorTaskId;
              const otherTask = tasks.find((t) => t.id === otherId);
              return (
                <div
                  key={dep.id}
                  className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs group"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Link className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-400 dark:text-gray-500">{isPred ? 'to' : 'from'}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
                      {otherTask?.title || 'Unknown'}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">({dep.type})</span>
                  </div>
                  <button
                    onClick={() => deleteDependency(dep.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-gray-400 dark:text-gray-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {taskDeps.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">No dependencies</p>
            )}
          </div>
        </div>

        {/* Parent task */}
        {task.parentId && (
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Parent Task
            </label>
            <select
              value={task.parentId || ''}
              onChange={(e) => handleFieldChange('parentId', e.target.value || null)}
              className="w-full mt-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">None (top level)</option>
              {tasks
                .filter((t) => t.type === 'summary' && t.id !== task.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
