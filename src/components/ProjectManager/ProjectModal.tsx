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
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import type { Role } from '../../types';

interface ProjectModalProps {
  onClose: () => void;
}

type Tab = 'projects' | 'owners' | 'tags';

export default function ProjectModal({ onClose }: ProjectModalProps) {
  const {
    projects,
    activeProjectIndex,
    project,
    users,
    tasks,
    switchProject,
    createProject,
    deleteProject,
    updateProject,
    addUser,
    removeUser,
    updateTask,
  } = useProjectStore();

  const [tab, setTab] = useState<Tab>('projects');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);

  // Owner management
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerRole, setNewOwnerRole] = useState<Role>('editor');

  // Tags management
  const allTags = [...new Set(tasks.flatMap((t) => t.tags))].sort();
  const [newTag, setNewTag] = useState('');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim(), newProjectDesc.trim());
    setNewProjectName('');
    setNewProjectDesc('');
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

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    // Tags are stored per-task; we just keep a reference. The user can now
    // assign this tag to any task via the task drawer.
    // We'll add it to a "hidden" task so it shows up in the filter list,
    // but better: we persist available tags. For simplicity we add it to a list
    // that shows in the tag picker.
    setNewTag('');
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
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Project Management</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Current Project
                </h3>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                  {editingName ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                        placeholder="Project name"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
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
                          className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{project.name}</div>
                        <div className="text-xs text-gray-500">{project.description || 'No description'}</div>
                      </div>
                      <button
                        onClick={() => {
                          setEditName(project.name);
                          setEditDesc(project.description);
                          setEditingName(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Project list */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  All Projects ({projects.length})
                </h3>
                <div className="space-y-1">
                  {projects.map((pd, idx) => (
                    <div
                      key={pd.project.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        idx === activeProjectIndex
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-100 hover:bg-gray-50'
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
                          <div className="text-sm font-medium text-gray-800">{pd.project.name}</div>
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
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
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
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Create New Project
                </h3>
                <div className="p-3 border border-gray-200 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="Project name"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <input
                    type="text"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="Description (optional)"
                  />
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
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Team Members ({users.length})
                </h3>
                <div className="space-y-1">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                          {u.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email} &middot; {u.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${u.name}?`)) removeUser(u.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
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
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Add Team Member
                </h3>
                <div className="p-3 border border-gray-200 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="Name"
                  />
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="Email"
                  />
                  <select
                    value={newOwnerRole}
                    onChange={(e) => setNewOwnerRole(e.target.value as Role)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
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
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
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
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full group"
                        >
                          <span className="text-sm text-gray-700">{tag}</span>
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

              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                To add or remove tags from individual tasks, open the task details panel (double-click a task) and edit the Tags field.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
