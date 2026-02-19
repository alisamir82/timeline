import React from 'react';
import { X } from 'lucide-react';
import type { RAGStatus } from '../../types';
import { DEFAULT_STATUSES, RAG_COLORS } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';

interface FilterPanelProps {
  onClose: () => void;
}

export default function FilterPanel({ onClose }: FilterPanelProps) {
  const { filters, setFilters, clearFilters, tasks, users, customFields } = useProjectStore();

  const allOwners = [...new Set(tasks.map((t) => t.ownerText).filter(Boolean))];
  const allTags = [...new Set(tasks.flatMap((t) => t.tags))];

  const toggleArrayFilter = (key: 'owners' | 'statuses' | 'tags', value: string) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilters({ [key]: updated });
  };

  const toggleRagFilter = (rag: RAGStatus) => {
    const current = filters.rags;
    const updated = current.includes(rag)
      ? current.filter((v) => v !== rag)
      : [...current, rag];
    setFilters({ rags: updated });
  };

  const activeCount =
    filters.owners.length +
    filters.statuses.length +
    filters.rags.length +
    filters.tags.length +
    (filters.searchText ? 1 : 0);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded-full font-medium">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* Status filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block mb-1">
            Status
          </label>
          <div className="flex flex-wrap gap-1">
            {DEFAULT_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => toggleArrayFilter('statuses', status)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  filters.statuses.includes(status)
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Owner filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block mb-1">
            Owner
          </label>
          <div className="flex flex-wrap gap-1">
            {allOwners.map((owner) => (
              <button
                key={owner}
                onClick={() => toggleArrayFilter('owners', owner)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  filters.owners.includes(owner)
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {owner}
              </button>
            ))}
          </div>
        </div>

        {/* RAG filter */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block mb-1">
            RAG
          </label>
          <div className="flex gap-1.5">
            {(['red', 'amber', 'green', 'none'] as RAGStatus[]).map((rag) => (
              <button
                key={rag}
                onClick={() => toggleRagFilter(rag)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  filters.rags.includes(rag) ? 'border-gray-800 scale-110' : 'border-transparent opacity-50'
                }`}
                style={{ backgroundColor: RAG_COLORS[rag] }}
                title={rag === 'none' ? 'None' : rag.toUpperCase()}
              />
            ))}
          </div>
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleArrayFilter('tags', tag)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
