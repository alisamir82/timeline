import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  FolderOpen,
  Check,
  Users,
  UserPlus,
  Tag,
  Monitor,
  Code,
  Megaphone,
  Rocket,
  CalendarDays,
  Building2,
  FileText,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { PROJECT_TEMPLATES } from '../../utils/templates';
import type { Role } from '../../types';

interface ProjectModalProps {
  onClose: () => void;
  onProjectCreated?: () => void;
}

type Tab = 'projects' | 'owners' | 'tags';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'monitor': <Monitor className="w-5 h-5" />,
  'code': <Code className="w-5 h-5" />,
  'megaphone': <Megaphone className="w-5 h-5" />,
  'rocket': <Rocket className="w-5 h-5" />,
  'calendar': <CalendarDays className="w-5 h-5" />,
  'building': <Building2 className="w-5 h-5" />,
};

export default function ProjectModal({ onClose, onProjectCreated }: ProjectModalProps) {
  const {
    projects,
    activeProjectIndex,
    project,
    users,
    tasks,
    switchProject,
    createProjectFromTemplate,
    deleteProject,
    updateProject,
    addUser,
    removeUser,
    updateTask,
  } = useProjectStore();

  const [tab, setTab] = useState<Tab>('projects');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectStartDate, setNewProjectStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('it-project');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);

  // Owner management
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerRole, setNewOwnerRole] = useState<Role>('editor');

  // Tags management
  const allTags = [...new Set(tasks.flatMap((t) => t.tags))].sort();

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProjectFromTemplate(
      newProjectName.trim(),
      newProjectDesc.trim(),
      selectedTemplate,
      new Date(newProjectStartDate),
    );
    setNewProjectName('');
    setNewProjectDesc('');
    setSelectedTemplate('it-project');
    if (onProjectCreated) onProjectCreated();
  };

  const handleSaveProjectDetails = () => {
    updateProject({ name: editName, description: editDesc });
    setEditingName(false);
  };

  const handleAddOwner = () => {
    if (!newOwnerName.trim()) return;
    addUser(newOwnerName.trim(), newOwnerEmail.trim(), newOwnerRole);
    setNewOwnerName('');
    setNewOwnerEmail('');
    setNewOwnerRole('editor');
  };

  const handleRemoveTagFromAll = (tag: string) => {
    tasks.forEach((t) => {
      if (t.tags.includes(tag)) {
        updateTask(t.id, { tags: t.tags.filter((tg) => tg !== tag) });
      }
    });
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'projects', label: 'Projects', icon: <FolderOpen className="w-4 h-4" /> },
    { key: 'owners', label: 'Team Members', icon: <Users className="w-4 h-4" /> },
    { key: 'tags', label: 'Tags', icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Project Management</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Projects tab */}
          {tab === 'projects' && (
            <div className="space-y-4">
              {/* Current project settings */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Current Project
                </h3>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg space-y-2">
                  {editingName ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                        placeholder="Project name"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProjectDetails}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingName(false)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{project.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{project.description || 'No description'}</div>
                      </div>
                      <button
                        onClick={() => {
                          setEditName(project.name);
                          setEditDesc(project.description);
                          setEditingName(true);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Project list */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  All Projects ({projects.length})
                </h3>
                <div className="space-y-1">
                  {projects.map((pd, idx) => (
                    <div
                      key={pd.project.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        idx === activeProjectIndex
                          ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => {
                        switchProject(idx);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {idx === activeProjectIndex && (
                          <Check className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{pd.project.name}</div>
                          <div className="text-xs text-gray-400">
                            {pd.tasks.length} tasks &middot; {pd.project.startDate}
                          </div>
                        </div>
                      </div>
                      {projects.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${pd.project.name}"?`)) {
                              deleteProject(idx);
                            }
                          }}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Create new project */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Create New Project
                </h3>
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                    placeholder="Project name"
                  />
                  <input
                    type="text"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                    placeholder="Description (optional)"
                  />
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newProjectStartDate}
                      onChange={(e) => setNewProjectStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                    />
                  </div>

                  {/* Template selection */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                      Template
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Blank option */}
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                          selectedTemplate === null
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className={`p-1.5 rounded ${selectedTemplate === null ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Blank Project</div>
                          <div className="text-[10px] text-gray-400">Start from scratch</div>
                        </div>
                      </button>

                      {/* Templates */}
                      {PROJECT_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => setSelectedTemplate(tmpl.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                            selectedTemplate === tmpl.id
                              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className={`p-1.5 rounded ${selectedTemplate === tmpl.id ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            {TEMPLATE_ICONS[tmpl.icon] || <FileText className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{tmpl.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{tmpl.tasks.length} tasks</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Owners / Team Members tab */}
          {tab === 'owners' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Team Members ({users.length})
                </h3>
                <div className="space-y-1">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                          {u.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email} &middot; {u.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${u.name}?`)) removeUser(u.id);
                        }}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add new member */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Add Team Member
                </h3>
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                    placeholder="Name"
                  />
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                    placeholder="Email"
                  />
                  <select
                    value={newOwnerRole}
                    onChange={(e) => setNewOwnerRole(e.target.value as Role)}
                    className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                  >
                    <option value="project_admin">Project Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={handleAddOwner}
                    disabled={!newOwnerName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Member
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tags tab */}
          {tab === 'tags' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Tags in Use ({allTags.length})
                </h3>
                {allTags.length === 0 ? (
                  <p className="text-sm text-gray-400">No tags yet. Add tags to tasks via the task details panel.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      const count = tasks.filter((t) => t.tags.includes(tag)).length;
                      return (
                        <div
                          key={tag}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full group"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">{tag}</span>
                          <span className="text-[10px] text-gray-400">({count})</span>
                          <button
                            onClick={() => {
                              if (confirm(`Remove tag "${tag}" from all ${count} task(s)?`)) {
                                handleRemoveTagFromAll(tag);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                To add or remove tags from individual tasks, open the task details panel (double-click a task) and edit the Tags field.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
