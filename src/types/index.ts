// ============================================================
// Timeline Planning Tool - Core Types
// ============================================================

export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export type TaskType = 'task' | 'milestone' | 'summary';

export type RAGStatus = 'red' | 'amber' | 'green' | 'none';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type SchedulingMode = 'warn' | 'auto' | 'strict';

export type Role = 'workspace_admin' | 'project_admin' | 'editor' | 'viewer';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'multi_select'
  | 'user_picker'
  | 'boolean'
  | 'url';

// ---- Entities ----

export interface Workspace {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  startDate: string; // ISO date
  endDate: string;
  schedulingMode: SchedulingMode;
  defaultZoom: ZoomLevel;
  createdBy: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  type: TaskType;
  title: string;
  description: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  duration: number; // in days
  ownerUserId: string | null;
  ownerText: string;
  status: string;
  rag: RAGStatus;
  percentComplete: number;
  color: string;
  notes: string;
  tags: string[];
  orderIndex: number;
  collapsed: boolean; // UI state for summary tasks
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dependency {
  id: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: DependencyType;
  lagDays: number;
  createdAt: string;
}

export interface CustomFieldDefinition {
  id: string;
  scope: 'workspace' | 'project';
  scopeId: string; // workspace or project id
  name: string;
  key: string;
  fieldType: CustomFieldType;
  options: string[]; // for dropdown/multi_select
  required: boolean;
  visibleByDefault: boolean;
}

export interface CustomFieldValue {
  id: string;
  taskId: string;
  fieldDefinitionId: string;
  value: string; // stored as string, parsed by type
}

export interface Comment {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: string;
  afterJson: string;
  timestamp: string;
}

// ---- View & Filter ----

export interface SavedView {
  id: string;
  projectId: string;
  name: string;
  isTeamView: boolean;
  createdBy: string;
  zoom: ZoomLevel;
  filters: FilterState;
  visibleColumns: string[];
  groupBy: string | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface FilterState {
  searchText: string;
  owners: string[];
  statuses: string[];
  rags: RAGStatus[];
  dateRange: { start: string; end: string } | null;
  customFields: Record<string, string[]>;
  tags: string[];
}

// ---- UI State ----

export interface TimelineViewport {
  scrollLeft: number;
  scrollTop: number;
  viewStartDate: string;
  viewEndDate: string;
}

export const DEFAULT_STATUSES = [
  'Not Started',
  'In Progress',
  'On Hold',
  'Complete',
  'Cancelled',
];

export const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

export const RAG_COLORS: Record<RAGStatus, string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
  none: '#9ca3af',
};

export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  FS: 'Finish-to-Start',
  SS: 'Start-to-Start',
  FF: 'Finish-to-Finish',
  SF: 'Start-to-Finish',
};
