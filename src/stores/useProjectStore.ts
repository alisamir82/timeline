import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Task,
  Dependency,
  CustomFieldDefinition,
  CustomFieldValue,
  AuditEvent,
  StickyNote,
  User,
  ZoomLevel,
  FilterState,
  RAGStatus,
  DependencyType,
  TaskType,
  ThemeMode,
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
import { createProjectFromTemplate } from '../utils/templates';

// Serializable project data for save/load
export interface ProjectData {
  project: Project;
  tasks: Task[];
  dependencies: Dependency[];
  customFields: CustomFieldDefinition[];
  customFieldValues: CustomFieldValue[];
  stickyNotes: StickyNote[];
  users: User[];
  auditLog: AuditEvent[];
}

interface DragState {
  taskId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  originalStart: string;
  originalEnd: string;
}

interface ProjectState {
  // Multi-project
  projects: ProjectData[];
  activeProjectIndex: number;

  // Shortcut accessors to active project data
  project: Project;
  tasks: Task[];
  dependencies: Dependency[];
  customFields: CustomFieldDefinition[];
  customFieldValues: CustomFieldValue[];
  stickyNotes: StickyNote[];
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
  addNoteMode: boolean;

  // Theme & auto-save
  theme: ThemeMode;
  autoSave: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;

  // Actions
  setZoom: (zoom: ZoomLevel) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAutoSave: (on: boolean) => void;
  markDirty: () => void;
  markSaved: () => void;
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
  updateDependencyWaypoints: (id: string, waypoints: { x: number; y: number }[]) => void;

  // Custom fields
  addCustomField: (field: Partial<CustomFieldDefinition>) => void;
  updateCustomFieldValue: (taskId: string, fieldId: string, value: string) => void;

  // User management
  addUser: (name: string, email: string, role: Role) => void;
  removeUser: (id: string) => void;

  // Filters
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;

  // Bulk actions
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => void;
  bulkShiftDates: (taskIds: string[], days: number) => void;
  bulkDelete: (taskIds: string[]) => void;

  // Sticky notes
  setAddNoteMode: (on: boolean) => void;
  addStickyNote: (taskId: string) => void;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;

  // Drag
  setDragState: (state: DragState | null) => void;

  // Computed
  getVisibleTasks: () => Task[];
  getQualityGates: () => Task[];
  getChildTasks: (parentId: string) => Task[];
  getTaskDependencies: (taskId: string) => Dependency[];
  getCustomFieldValuesForTask: (taskId: string) => CustomFieldValue[];

  // Multi-project
  switchProject: (index: number) => void;
  createProject: (name: string, description: string) => void;
  createProjectFromTemplate: (name: string, description: string, templateId: string | null, startDate: Date) => void;
  deleteProject: (index: number) => void;
  updateProject: (updates: Partial<Project>) => void;

  // Save/Load
  exportAllData: () => string;
  importAllData: (json: string) => boolean;
  exportActiveProject: () => string;
  importProject: (json: string) => boolean;

  // Internal
  addAuditEvent: (action: string, entityType: string, entityId: string, before: unknown, after: unknown) => void;
  syncActiveProject: () => void;
}

type Role = 'workspace_admin' | 'project_admin' | 'editor' | 'viewer';

const defaultFilters: FilterState = {
  searchText: '',
  owners: [],
  statuses: [],
  rags: [],
  dateRange: null,
  customFields: {},
  tags: [],
};

function makeEmptyProjectData(name: string, description: string, createdBy: string): ProjectData {
  const id = uuidv4();
  const now = toISODate(new Date());
  const endDate = toISODate(addDays(new Date(), 90));
  return {
    project: {
      id,
      workspaceId: 'ws-1',
      name,
      description,
      startDate: now,
      endDate,
      schedulingMode: 'warn',
      defaultZoom: 'week',
      createdBy,
      createdAt: now,
    },
    tasks: [],
    dependencies: [],
    customFields: [],
    customFieldValues: [],
    stickyNotes: [],
    users: [],
    auditLog: [],
  };
}

const initialProject: ProjectData = {
  project: sampleProject,
  tasks: sampleTasks,
  dependencies: sampleDependencies,
  customFields: sampleCustomFields,
  customFieldValues: sampleCustomFieldValues,
  stickyNotes: [],
  users: sampleUsers,
  auditLog: sampleAuditEvents,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Multi-project
  projects: [initialProject],
  activeProjectIndex: 0,

  // Active project data (synced from projects[activeProjectIndex])
  project: initialProject.project,
  tasks: initialProject.tasks,
  dependencies: initialProject.dependencies,
  customFields: initialProject.customFields,
  customFieldValues: initialProject.customFieldValues,
  stickyNotes: initialProject.stickyNotes,
  users: initialProject.users,
  auditLog: initialProject.auditLog,
  currentUser: sampleUsers[0],

  // UI state
  zoom: sampleProject.defaultZoom,
  selectedTaskId: null,
  hoveredTaskId: null,
  hoveredDependencyId: null,
  showTaskDetails: false,
  filters: defaultFilters,
  dragState: null,
  addNoteMode: false,

  // Theme & auto-save
  theme: (localStorage.getItem('timeline-theme') as ThemeMode) || 'light',
  autoSave: localStorage.getItem('timeline-autosave') !== 'false',
  isDirty: false,
  lastSavedAt: null,

  // Zoom
  setZoom: (zoom) => set({ zoom }),

  // Theme
  setTheme: (theme) => {
    localStorage.setItem('timeline-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const cycle: Record<string, ThemeMode> = { light: 'dark', dark: 'corporate', corporate: 'light' };
    const newTheme = cycle[get().theme] || 'light';
    localStorage.setItem('timeline-theme', newTheme);
    set({ theme: newTheme });
  },

  // Auto-save
  setAutoSave: (on) => {
    localStorage.setItem('timeline-autosave', String(on));
    set({ autoSave: on });
  },
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

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
    get().syncActiveProject();
  },

  updateTask: (id, updates) => {
    const { tasks } = get();
    const oldTask = tasks.find((t) => t.id === id);
    if (!oldTask) return;

    const updatedTask = { ...oldTask, ...updates, updatedAt: new Date().toISOString() };

    if (updates.startDate || updates.endDate) {
      const start = parseISO(updatedTask.startDate);
      const end = parseISO(updatedTask.endDate);
      updatedTask.duration = Math.max(0, differenceInCalendarDays(end, start));
    }

    set({ tasks: tasks.map((t) => (t.id === id ? updatedTask : t)) });
    get().addAuditEvent('update', 'task', id, oldTask, updatedTask);
    get().syncActiveProject();
  },

  deleteTask: (id) => {
    const { tasks, dependencies, stickyNotes } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const childIds = tasks.filter((t) => t.parentId === id).map((t) => t.id);
    const allIdsToDelete = [id, ...childIds];

    set({
      tasks: tasks.filter((t) => !allIdsToDelete.includes(t.id)),
      dependencies: dependencies.filter(
        (d) =>
          !allIdsToDelete.includes(d.predecessorTaskId) &&
          !allIdsToDelete.includes(d.successorTaskId)
      ),
      stickyNotes: stickyNotes.filter((n) => !allIdsToDelete.includes(n.taskId)),
    });
    get().addAuditEvent('delete', 'task', id, task, null);
    get().syncActiveProject();
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
    get().syncActiveProject();
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
    get().syncActiveProject();
  },

  // Dependency CRUD
  addDependency: (predecessorId, successorId, type) => {
    const { dependencies, project } = get();

    if (predecessorId === successorId) return false;
    if (wouldCreateCycle(dependencies, predecessorId, successorId)) return false;

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
      waypoints: [],
      createdAt: new Date().toISOString(),
    };

    set({ dependencies: [...dependencies, newDep] });
    get().addAuditEvent('create', 'dependency', newDep.id, null, newDep);
    get().syncActiveProject();
    return true;
  },

  deleteDependency: (id) => {
    const { dependencies } = get();
    const dep = dependencies.find((d) => d.id === id);
    set({ dependencies: dependencies.filter((d) => d.id !== id) });
    if (dep) get().addAuditEvent('delete', 'dependency', id, dep, null);
    get().syncActiveProject();
  },

  updateDependencyWaypoints: (id, waypoints) => {
    const { dependencies } = get();
    set({
      dependencies: dependencies.map((d) =>
        d.id === id ? { ...d, waypoints } : d
      ),
    });
    get().syncActiveProject();
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
    get().syncActiveProject();
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
    get().syncActiveProject();
  },

  // User management
  addUser: (name, email, role) => {
    const { users } = get();
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      role,
    };
    set({ users: [...users, newUser] });
    get().syncActiveProject();
  },

  removeUser: (id) => {
    const { users, currentUser } = get();
    if (id === currentUser.id) return; // can't remove self
    set({ users: users.filter((u) => u.id !== id) });
    get().syncActiveProject();
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
    get().syncActiveProject();
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
    get().syncActiveProject();
  },

  bulkDelete: (taskIds) => {
    const { tasks, dependencies } = get();
    set({
      tasks: tasks.filter((t) => !taskIds.includes(t.id)),
      dependencies: dependencies.filter(
        (d) => !taskIds.includes(d.predecessorTaskId) && !taskIds.includes(d.successorTaskId)
      ),
    });
    get().syncActiveProject();
  },

  // Sticky notes
  setAddNoteMode: (on) => set({ addNoteMode: on }),

  addStickyNote: (taskId) => {
    const { stickyNotes } = get();
    // One note per task
    if (stickyNotes.some((n) => n.taskId === taskId)) return;
    const newNote: StickyNote = {
      id: uuidv4(),
      taskId,
      text: '',
      color: '#fef08a',
      offsetX: 60,
      offsetY: -70,
      createdAt: new Date().toISOString(),
    };
    set({ stickyNotes: [...stickyNotes, newNote], addNoteMode: false });
    get().syncActiveProject();
  },

  updateStickyNote: (id, updates) => {
    const { stickyNotes } = get();
    set({ stickyNotes: stickyNotes.map((n) => (n.id === id ? { ...n, ...updates } : n)) });
    get().syncActiveProject();
  },

  deleteStickyNote: (id) => {
    const { stickyNotes } = get();
    set({ stickyNotes: stickyNotes.filter((n) => n.id !== id) });
    get().syncActiveProject();
  },

  // Drag
  setDragState: (state) => set({ dragState: state }),

  // Computed
  getVisibleTasks: () => {
    const { tasks, filters } = get();
    let result = [...tasks].filter((t) => t.type !== 'quality_gate').sort((a, b) => a.orderIndex - b.orderIndex);

    const collapsedParentIds = new Set(
      tasks.filter((t) => t.type === 'summary' && t.collapsed).map((t) => t.id)
    );
    result = result.filter((t) => !t.parentId || !collapsedParentIds.has(t.parentId));

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

  getQualityGates: () => {
    return get().tasks.filter((t) => t.type === 'quality_gate').sort((a, b) => a.orderIndex - b.orderIndex);
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

  // Multi-project
  switchProject: (index) => {
    const { projects } = get();
    if (index < 0 || index >= projects.length) return;
    const pd = projects[index];
    set({
      activeProjectIndex: index,
      project: pd.project,
      tasks: pd.tasks,
      dependencies: pd.dependencies,
      customFields: pd.customFields,
      customFieldValues: pd.customFieldValues,
      stickyNotes: pd.stickyNotes || [],
      users: pd.users,
      auditLog: pd.auditLog,
      zoom: pd.project.defaultZoom,
      selectedTaskId: null,
      showTaskDetails: false,
      filters: defaultFilters,
      addNoteMode: false,
    });
  },

  createProject: (name, description) => {
    const { projects, currentUser } = get();
    const newPd = makeEmptyProjectData(name, description, currentUser.id);
    newPd.users = [...get().users];
    const newProjects = [...projects, newPd];
    set({ projects: newProjects });
    get().switchProject(newProjects.length - 1);
  },

  createProjectFromTemplate: (name, description, templateId, startDate) => {
    const { projects, currentUser } = get();
    const newPd = createProjectFromTemplate(templateId, name, description, startDate, currentUser.id);
    newPd.users = [...get().users];
    const newProjects = [...projects, newPd];
    set({ projects: newProjects });
    get().switchProject(newProjects.length - 1);
  },

  deleteProject: (index) => {
    const { projects, activeProjectIndex } = get();
    if (projects.length <= 1) return; // must keep at least one
    const newProjects = projects.filter((_, i) => i !== index);
    const newActive = activeProjectIndex >= newProjects.length ? newProjects.length - 1 : activeProjectIndex;
    set({ projects: newProjects });
    get().switchProject(newActive);
  },

  updateProject: (updates) => {
    const { project } = get();
    const updated = { ...project, ...updates };
    set({ project: updated });
    get().syncActiveProject();
  },

  // Save/Load
  exportAllData: () => {
    get().syncActiveProject();
    const { projects, currentUser, activeProjectIndex } = get();
    return JSON.stringify({ version: 1, projects, currentUser, activeProjectIndex }, null, 2);
  },

  importAllData: (json) => {
    try {
      const data = JSON.parse(json);
      if (!data.projects || !Array.isArray(data.projects) || data.projects.length === 0) {
        return false;
      }
      set({ projects: data.projects });
      if (data.currentUser) {
        set({ currentUser: data.currentUser });
      }
      const index = typeof data.activeProjectIndex === 'number' && data.activeProjectIndex < data.projects.length
        ? data.activeProjectIndex
        : 0;
      get().switchProject(index);
      return true;
    } catch {
      return false;
    }
  },

  exportActiveProject: () => {
    get().syncActiveProject();
    const { projects, activeProjectIndex } = get();
    return JSON.stringify({ version: 1, project: projects[activeProjectIndex] }, null, 2);
  },

  importProject: (json) => {
    try {
      const data = JSON.parse(json);
      let pd: ProjectData;
      if (data.project && data.project.project) {
        pd = data.project;
      } else if (data.projects && data.projects.length > 0) {
        // Importing full export, take first project
        pd = data.projects[0];
      } else {
        return false;
      }
      const { projects } = get();
      const newProjects = [...projects, pd];
      set({ projects: newProjects });
      get().switchProject(newProjects.length - 1);
      return true;
    } catch {
      return false;
    }
  },

  // Sync active project data back into projects array
  syncActiveProject: () => {
    const { projects, activeProjectIndex, project, tasks, dependencies, customFields, customFieldValues, stickyNotes, users, auditLog } = get();
    const updated: ProjectData = {
      project,
      tasks,
      dependencies,
      customFields,
      customFieldValues,
      stickyNotes,
      users,
      auditLog,
    };
    const newProjects = [...projects];
    newProjects[activeProjectIndex] = updated;
    set({ projects: newProjects, isDirty: true });
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
