import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Task,
  Dependency,
  CustomFieldDefinition,
  CustomFieldValue,
  AuditEvent,
  User,
  ZoomLevel,
  FilterState,
  RAGStatus,
  DependencyType,
  TaskType,
} from '../types';
import {
  sampleProject,
  sampleTasks,
  sampleDependencies,
  sampleCustomFields,
  sampleCustomFieldValues,
  sampleUsers,
  sampleAuditEvents,
} from '../utils/sampleData';
import { wouldCreateCycle } from '../utils/dependencies';
import { toISODate, addDays, parseISO, differenceInCalendarDays } from '../utils/dates';

interface ProjectState {
  // Data
  project: Project;
  tasks: Task[];
  dependencies: Dependency[];
  customFields: CustomFieldDefinition[];
  customFieldValues: CustomFieldValue[];
  users: User[];
  auditLog: AuditEvent[];
  currentUser: User;

  // UI state
  zoom: ZoomLevel;
  selectedTaskId: string | null;
  hoveredTaskId: string | null;
  hoveredDependencyId: string | null;
  showTaskDetails: boolean;
  filters: FilterState;
  dragState: DragState | null;

  // Actions
  setZoom: (zoom: ZoomLevel) => void;
  selectTask: (id: string | null) => void;
  setHoveredTask: (id: string | null) => void;
  setHoveredDependency: (id: string | null) => void;
  openTaskDetails: (id: string) => void;
  closeTaskDetails: () => void;

  // Task CRUD
  addTask: (partial: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStartDate: string, newEndDate: string) => void;
  toggleCollapse: (id: string) => void;
  reorderTask: (id: string, newIndex: number) => void;

  // Dependency CRUD
  addDependency: (predecessorId: string, successorId: string, type: DependencyType) => boolean;
  deleteDependency: (id: string) => void;

  // Custom fields
  addCustomField: (field: Partial<CustomFieldDefinition>) => void;
  updateCustomFieldValue: (taskId: string, fieldId: string, value: string) => void;

  // Filters
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;

  // Bulk actions
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => void;
  bulkShiftDates: (taskIds: string[], days: number) => void;
  bulkDelete: (taskIds: string[]) => void;

  // Drag
  setDragState: (state: DragState | null) => void;

  // Computed
  getVisibleTasks: () => Task[];
  getChildTasks: (parentId: string) => Task[];
  getTaskDependencies: (taskId: string) => Dependency[];
  getCustomFieldValuesForTask: (taskId: string) => CustomFieldValue[];

  // Internal
  addAuditEvent: (action: string, entityType: string, entityId: string, before: unknown, after: unknown) => void;
}

interface DragState {
  taskId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  originalStart: string;
  originalEnd: string;
}

const defaultFilters: FilterState = {
  searchText: '',
  owners: [],
  statuses: [],
  rags: [],
  dateRange: null,
  customFields: {},
  tags: [],
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial data
  project: sampleProject,
  tasks: sampleTasks,
  dependencies: sampleDependencies,
  customFields: sampleCustomFields,
  customFieldValues: sampleCustomFieldValues,
  users: sampleUsers,
  auditLog: sampleAuditEvents,
  currentUser: sampleUsers[0],

  // UI state
  zoom: sampleProject.defaultZoom,
  selectedTaskId: null,
  hoveredTaskId: null,
  hoveredDependencyId: null,
  showTaskDetails: false,
  filters: defaultFilters,
  dragState: null,

  // Zoom
  setZoom: (zoom) => set({ zoom }),

  // Selection
  selectTask: (id) => set({ selectedTaskId: id }),
  setHoveredTask: (id) => set({ hoveredTaskId: id }),
  setHoveredDependency: (id) => set({ hoveredDependencyId: id }),

  openTaskDetails: (id) => set({ selectedTaskId: id, showTaskDetails: true }),
  closeTaskDetails: () => set({ showTaskDetails: false }),

  // Task CRUD
  addTask: (partial) => {
    const now = new Date().toISOString();
    const { tasks, project, currentUser } = get();
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.orderIndex)) : -1;

    const newTask: Task = {
      id: uuidv4(),
      projectId: project.id,
      parentId: null,
      type: 'task' as TaskType,
      title: 'New Task',
      description: '',
      startDate: toISODate(new Date()),
      endDate: toISODate(addDays(new Date(), 7)),
      duration: 7,
      ownerUserId: null,
      ownerText: '',
      status: 'Not Started',
      rag: 'none' as RAGStatus,
      percentComplete: 0,
      color: '#3b82f6',
      notes: '',
      tags: [],
      orderIndex: maxOrder + 1,
      collapsed: false,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
      ...partial,
    };

    set({ tasks: [...tasks, newTask], selectedTaskId: newTask.id, showTaskDetails: true });
    get().addAuditEvent('create', 'task', newTask.id, null, newTask);
  },

  updateTask: (id, updates) => {
    const { tasks } = get();
    const oldTask = tasks.find((t) => t.id === id);
    if (!oldTask) return;

    const updatedTask = { ...oldTask, ...updates, updatedAt: new Date().toISOString() };

    // If dates changed, recalculate duration
    if (updates.startDate || updates.endDate) {
      const start = parseISO(updatedTask.startDate);
      const end = parseISO(updatedTask.endDate);
      updatedTask.duration = Math.max(0, differenceInCalendarDays(end, start));
    }

    set({ tasks: tasks.map((t) => (t.id === id ? updatedTask : t)) });
    get().addAuditEvent('update', 'task', id, oldTask, updatedTask);
  },

  deleteTask: (id) => {
    const { tasks, dependencies } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Also delete children
    const childIds = tasks.filter((t) => t.parentId === id).map((t) => t.id);
    const allIdsToDelete = [id, ...childIds];

    set({
      tasks: tasks.filter((t) => !allIdsToDelete.includes(t.id)),
      dependencies: dependencies.filter(
        (d) =>
          !allIdsToDelete.includes(d.predecessorTaskId) &&
          !allIdsToDelete.includes(d.successorTaskId)
      ),
    });
    get().addAuditEvent('delete', 'task', id, task, null);
  },

  moveTask: (id, newStartDate, newEndDate) => {
    get().updateTask(id, { startDate: newStartDate, endDate: newEndDate });
  },

  toggleCollapse: (id) => {
    const { tasks } = get();
    set({
      tasks: tasks.map((t) =>
        t.id === id ? { ...t, collapsed: !t.collapsed } : t
      ),
    });
  },

  reorderTask: (id, newIndex) => {
    const { tasks } = get();
    const sortedTasks = [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);
    const taskIndex = sortedTasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) return;

    const [moved] = sortedTasks.splice(taskIndex, 1);
    sortedTasks.splice(newIndex, 0, moved);

    set({
      tasks: sortedTasks.map((t, i) => ({ ...t, orderIndex: i })),
    });
  },

  // Dependency CRUD
  addDependency: (predecessorId, successorId, type) => {
    const { dependencies, project } = get();

    if (predecessorId === successorId) return false;
    if (wouldCreateCycle(dependencies, predecessorId, successorId)) return false;

    // Check for duplicate
    const exists = dependencies.some(
      (d) => d.predecessorTaskId === predecessorId && d.successorTaskId === successorId
    );
    if (exists) return false;

    const newDep: Dependency = {
      id: uuidv4(),
      projectId: project.id,
      predecessorTaskId: predecessorId,
      successorTaskId: successorId,
      type,
      lagDays: 0,
      createdAt: new Date().toISOString(),
    };

    set({ dependencies: [...dependencies, newDep] });
    get().addAuditEvent('create', 'dependency', newDep.id, null, newDep);
    return true;
  },

  deleteDependency: (id) => {
    const { dependencies } = get();
    const dep = dependencies.find((d) => d.id === id);
    set({ dependencies: dependencies.filter((d) => d.id !== id) });
    if (dep) get().addAuditEvent('delete', 'dependency', id, dep, null);
  },

  // Custom fields
  addCustomField: (field) => {
    const { customFields, project } = get();
    const newField: CustomFieldDefinition = {
      id: uuidv4(),
      scope: 'project',
      scopeId: project.id,
      name: 'New Field',
      key: `field_${Date.now()}`,
      fieldType: 'text',
      options: [],
      required: false,
      visibleByDefault: true,
      ...field,
    };
    set({ customFields: [...customFields, newField] });
  },

  updateCustomFieldValue: (taskId, fieldId, value) => {
    const { customFieldValues } = get();
    const existing = customFieldValues.find(
      (v) => v.taskId === taskId && v.fieldDefinitionId === fieldId
    );

    if (existing) {
      set({
        customFieldValues: customFieldValues.map((v) =>
          v.id === existing.id ? { ...v, value } : v
        ),
      });
    } else {
      set({
        customFieldValues: [
          ...customFieldValues,
          { id: uuidv4(), taskId, fieldDefinitionId: fieldId, value },
        ],
      });
    }
  },

  // Filters
  setFilters: (updates) => {
    set({ filters: { ...get().filters, ...updates } });
  },

  clearFilters: () => set({ filters: defaultFilters }),

  // Bulk
  bulkUpdateTasks: (taskIds, updates) => {
    const { tasks } = get();
    set({
      tasks: tasks.map((t) =>
        taskIds.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    });
  },

  bulkShiftDates: (taskIds, days) => {
    const { tasks } = get();
    set({
      tasks: tasks.map((t) => {
        if (!taskIds.includes(t.id)) return t;
        const newStart = addDays(parseISO(t.startDate), days);
        const newEnd = addDays(parseISO(t.endDate), days);
        return {
          ...t,
          startDate: toISODate(newStart),
          endDate: toISODate(newEnd),
          updatedAt: new Date().toISOString(),
        };
      }),
    });
  },

  bulkDelete: (taskIds) => {
    const { tasks, dependencies } = get();
    set({
      tasks: tasks.filter((t) => !taskIds.includes(t.id)),
      dependencies: dependencies.filter(
        (d) => !taskIds.includes(d.predecessorTaskId) && !taskIds.includes(d.successorTaskId)
      ),
    });
  },

  // Drag
  setDragState: (state) => set({ dragState: state }),

  // Computed
  getVisibleTasks: () => {
    const { tasks, filters } = get();
    let result = [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);

    // Filter by collapsed parents
    const collapsedParentIds = new Set(
      tasks.filter((t) => t.type === 'summary' && t.collapsed).map((t) => t.id)
    );
    result = result.filter((t) => !t.parentId || !collapsedParentIds.has(t.parentId));

    // Apply filters
    if (filters.searchText) {
      const q = filters.searchText.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.ownerText.toLowerCase().includes(q)
      );
    }

    if (filters.owners.length > 0) {
      result = result.filter((t) => filters.owners.includes(t.ownerText));
    }

    if (filters.statuses.length > 0) {
      result = result.filter((t) => filters.statuses.includes(t.status));
    }

    if (filters.rags.length > 0) {
      result = result.filter((t) => filters.rags.includes(t.rag));
    }

    if (filters.tags.length > 0) {
      result = result.filter((t) => t.tags.some((tag) => filters.tags.includes(tag)));
    }

    return result;
  },

  getChildTasks: (parentId) => {
    return get().tasks.filter((t) => t.parentId === parentId);
  },

  getTaskDependencies: (taskId) => {
    return get().dependencies.filter(
      (d) => d.predecessorTaskId === taskId || d.successorTaskId === taskId
    );
  },

  getCustomFieldValuesForTask: (taskId) => {
    return get().customFieldValues.filter((v) => v.taskId === taskId);
  },

  // Internal helper
  addAuditEvent: (action: string, entityType: string, entityId: string, before: unknown, after: unknown) => {
    const { auditLog, project, currentUser } = get();
    const event: AuditEvent = {
      id: uuidv4(),
      projectId: project.id,
      actorUserId: currentUser.id,
      action,
      entityType,
      entityId,
      beforeJson: before ? JSON.stringify(before) : '',
      afterJson: after ? JSON.stringify(after) : '',
      timestamp: new Date().toISOString(),
    };
    set({ auditLog: [...auditLog, event] });
  },
}));
