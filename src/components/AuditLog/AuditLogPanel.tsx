import React from 'react';
import { X, Clock } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { format, parseISO } from 'date-fns';

interface AuditLogPanelProps {
  onClose: () => void;
}

export default function AuditLogPanel({ onClose }: AuditLogPanelProps) {
  const { auditLog, users } = useProjectStore();

  const sortedLog = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || userId;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '+ ';
      case 'update':
        return '~ ';
      case 'delete':
        return '- ';
      default:
        return '';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-50';
      case 'update':
        return 'text-blue-600 bg-blue-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Activity Log</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedLog.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No activity recorded yet.
            <br />
            <span className="text-xs">Changes will appear here as you work.</span>
          </div>
        )}
        {sortedLog.map((event) => (
          <div
            key={event.id}
            className="p-2 border border-gray-100 rounded-lg text-xs"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getActionColor(event.action)}`}>
                {event.action}
              </span>
              <span className="text-gray-500">{event.entityType}</span>
            </div>
            <div className="text-gray-600">
              <span className="font-medium">{getUserName(event.actorUserId)}</span>
              {' '}
              {event.action}d a {event.entityType}
            </div>
            <div className="text-gray-400 mt-1">
              {format(parseISO(event.timestamp), 'MMM d, HH:mm:ss')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
