import { v4 as uuidv4 } from 'uuid';
import { addDays, format } from 'date-fns';
import type { Task, Dependency, Project } from '../types';
import type { ProjectData } from '../stores/useProjectStore';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tasks: TemplateTask[];
  dependencies: [number, number][]; // [predecessorIdx, successorIdx] pairs (all FS)
}

interface TemplateTask {
  title: string;
  type: 'task' | 'milestone' | 'summary';
  dayOffset: number;
  duration: number;
  color: string;
  parentIdx?: number;
}

const toISO = (d: Date) => format(d, 'yyyy-MM-dd');

function buildProjectData(
  template: TemplateDefinition,
  projectName: string,
  projectDesc: string,
  startDate: Date,
  createdBy: string,
): ProjectData {
  const projectId = uuidv4();
  const now = toISO(new Date());

  // Find end date from tasks
  let maxEnd = 0;
  for (const t of template.tasks) {
    const end = t.dayOffset + t.duration;
    if (end > maxEnd) maxEnd = end;
  }

  const project: Project = {
    id: projectId,
    workspaceId: 'ws-1',
    name: projectName,
    description: projectDesc,
    startDate: toISO(startDate),
    endDate: toISO(addDays(startDate, maxEnd + 7)),
    schedulingMode: 'warn',
    defaultZoom: 'week',
    createdBy,
    createdAt: now,
  };

  const taskIds: string[] = template.tasks.map(() => uuidv4());

  const tasks: Task[] = template.tasks.map((t, i) => ({
    id: taskIds[i],
    projectId,
    parentId: t.parentIdx !== undefined ? taskIds[t.parentIdx] : null,
    type: t.type,
    title: t.title,
    description: '',
    startDate: toISO(addDays(startDate, t.dayOffset)),
    endDate: toISO(addDays(startDate, t.dayOffset + t.duration)),
    duration: t.duration,
    ownerUserId: null,
    ownerText: '',
    status: 'Not Started',
    rag: 'none',
    percentComplete: 0,
    color: t.color,
    notes: '',
    tags: [],
    orderIndex: i,
    collapsed: false,
    splitGroupId: null,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }));

  const dependencies: Dependency[] = template.dependencies.map(([predIdx, succIdx]) => ({
    id: uuidv4(),
    projectId,
    predecessorTaskId: taskIds[predIdx],
    successorTaskId: taskIds[succIdx],
    type: 'FS' as const,
    lagDays: 0,
    createdAt: now,
    manualRoute: null,
  }));

  return {
    project,
    tasks,
    dependencies,
    customFields: [],
    customFieldValues: [],
    stickyNotes: [],
    users: [],
    auditLog: [],
  };
}

// ============================
// Template Definitions
// ============================

const itProjectPlan: TemplateDefinition = {
  id: 'it-project',
  name: 'IT Project Plan',
  description: 'Full lifecycle IT project with phases from initiation through deployment',
  icon: 'monitor',
  tasks: [
    // 0: Initiation Phase
    { title: 'Initiation', type: 'summary', dayOffset: 0, duration: 12, color: '#3b82f6' },
    { title: 'Project Charter', type: 'task', dayOffset: 0, duration: 5, color: '#3b82f6', parentIdx: 0 },
    { title: 'Stakeholder Analysis', type: 'task', dayOffset: 3, duration: 4, color: '#3b82f6', parentIdx: 0 },
    { title: 'Feasibility Study', type: 'task', dayOffset: 5, duration: 5, color: '#3b82f6', parentIdx: 0 },
    { title: 'Kick-off Meeting', type: 'milestone', dayOffset: 12, duration: 0, color: '#8b5cf6', parentIdx: 0 },
    // 5: Planning Phase
    { title: 'Planning', type: 'summary', dayOffset: 13, duration: 18, color: '#22c55e' },
    { title: 'Project Plan & Schedule', type: 'task', dayOffset: 13, duration: 7, color: '#22c55e', parentIdx: 5 },
    { title: 'Resource Allocation', type: 'task', dayOffset: 18, duration: 5, color: '#22c55e', parentIdx: 5 },
    { title: 'Risk Assessment', type: 'task', dayOffset: 20, duration: 6, color: '#22c55e', parentIdx: 5 },
    { title: 'Budget Approval', type: 'milestone', dayOffset: 31, duration: 0, color: '#8b5cf6', parentIdx: 5 },
    // 10: Requirements Phase
    { title: 'Requirements', type: 'summary', dayOffset: 32, duration: 20, color: '#06b6d4' },
    { title: 'Business Requirements', type: 'task', dayOffset: 32, duration: 10, color: '#06b6d4', parentIdx: 10 },
    { title: 'Technical Requirements', type: 'task', dayOffset: 38, duration: 8, color: '#06b6d4', parentIdx: 10 },
    { title: 'Requirements Sign-off', type: 'milestone', dayOffset: 52, duration: 0, color: '#8b5cf6', parentIdx: 10 },
    // 14: Design Phase
    { title: 'Design', type: 'summary', dayOffset: 53, duration: 22, color: '#f59e0b' },
    { title: 'System Architecture', type: 'task', dayOffset: 53, duration: 10, color: '#f59e0b', parentIdx: 14 },
    { title: 'Database Design', type: 'task', dayOffset: 58, duration: 8, color: '#f59e0b', parentIdx: 14 },
    { title: 'UI/UX Design', type: 'task', dayOffset: 53, duration: 14, color: '#f59e0b', parentIdx: 14 },
    { title: 'Design Review', type: 'milestone', dayOffset: 75, duration: 0, color: '#8b5cf6', parentIdx: 14 },
    // 19: Development Phase
    { title: 'Development', type: 'summary', dayOffset: 76, duration: 40, color: '#ef4444' },
    { title: 'Backend Development', type: 'task', dayOffset: 76, duration: 30, color: '#ef4444', parentIdx: 19 },
    { title: 'Frontend Development', type: 'task', dayOffset: 76, duration: 30, color: '#ef4444', parentIdx: 19 },
    { title: 'API Integration', type: 'task', dayOffset: 96, duration: 12, color: '#ef4444', parentIdx: 19 },
    { title: 'Code Review & Refactor', type: 'task', dayOffset: 106, duration: 10, color: '#ef4444', parentIdx: 19 },
    // 24: Testing Phase
    { title: 'Testing', type: 'summary', dayOffset: 116, duration: 25, color: '#ec4899' },
    { title: 'Unit Testing', type: 'task', dayOffset: 116, duration: 8, color: '#ec4899', parentIdx: 24 },
    { title: 'Integration Testing', type: 'task', dayOffset: 122, duration: 10, color: '#ec4899', parentIdx: 24 },
    { title: 'User Acceptance Testing', type: 'task', dayOffset: 130, duration: 8, color: '#ec4899', parentIdx: 24 },
    { title: 'Go / No-Go Decision', type: 'milestone', dayOffset: 141, duration: 0, color: '#8b5cf6', parentIdx: 24 },
    // 29: Deployment
    { title: 'Deployment', type: 'summary', dayOffset: 142, duration: 12, color: '#6366f1' },
    { title: 'Deployment Planning', type: 'task', dayOffset: 142, duration: 5, color: '#6366f1', parentIdx: 29 },
    { title: 'Data Migration', type: 'task', dayOffset: 145, duration: 4, color: '#6366f1', parentIdx: 29 },
    { title: 'Production Deployment', type: 'task', dayOffset: 149, duration: 3, color: '#6366f1', parentIdx: 29 },
    { title: 'Go Live', type: 'milestone', dayOffset: 154, duration: 0, color: '#8b5cf6', parentIdx: 29 },
  ],
  dependencies: [
    [1, 2], [2, 3], [3, 4], [4, 6],
    [6, 7], [7, 8], [8, 9], [9, 11],
    [11, 12], [12, 13], [13, 15],
    [15, 16], [15, 17], [16, 18], [17, 18], [18, 20],
    [18, 21], [20, 22], [21, 22], [22, 23], [23, 25],
    [25, 26], [26, 27], [27, 28], [28, 30],
    [30, 31], [31, 32], [32, 33],
  ],
};

const agileSoftware: TemplateDefinition = {
  id: 'agile-software',
  name: 'Software Development (Agile)',
  description: 'Sprint-based agile development with backlog, sprints, and releases',
  icon: 'code',
  tasks: [
    // 0: Sprint 0 - Setup
    { title: 'Sprint 0 - Setup', type: 'summary', dayOffset: 0, duration: 10, color: '#6366f1' },
    { title: 'Environment Setup', type: 'task', dayOffset: 0, duration: 3, color: '#6366f1', parentIdx: 0 },
    { title: 'Architecture & Tech Stack', type: 'task', dayOffset: 2, duration: 5, color: '#6366f1', parentIdx: 0 },
    { title: 'Backlog Grooming', type: 'task', dayOffset: 5, duration: 5, color: '#6366f1', parentIdx: 0 },
    { title: 'Sprint 0 Complete', type: 'milestone', dayOffset: 10, duration: 0, color: '#8b5cf6', parentIdx: 0 },
    // 5: Sprint 1
    { title: 'Sprint 1', type: 'summary', dayOffset: 11, duration: 14, color: '#3b82f6' },
    { title: 'Sprint Planning', type: 'task', dayOffset: 11, duration: 1, color: '#3b82f6', parentIdx: 5 },
    { title: 'User Stories Development', type: 'task', dayOffset: 12, duration: 10, color: '#3b82f6', parentIdx: 5 },
    { title: 'Code Review & QA', type: 'task', dayOffset: 20, duration: 3, color: '#3b82f6', parentIdx: 5 },
    { title: 'Sprint Review & Retro', type: 'task', dayOffset: 24, duration: 1, color: '#3b82f6', parentIdx: 5 },
    // 10: Sprint 2
    { title: 'Sprint 2', type: 'summary', dayOffset: 25, duration: 14, color: '#22c55e' },
    { title: 'Sprint Planning', type: 'task', dayOffset: 25, duration: 1, color: '#22c55e', parentIdx: 10 },
    { title: 'Feature Development', type: 'task', dayOffset: 26, duration: 10, color: '#22c55e', parentIdx: 10 },
    { title: 'Code Review & QA', type: 'task', dayOffset: 34, duration: 3, color: '#22c55e', parentIdx: 10 },
    { title: 'Sprint Review & Retro', type: 'task', dayOffset: 38, duration: 1, color: '#22c55e', parentIdx: 10 },
    // 15: Sprint 3
    { title: 'Sprint 3', type: 'summary', dayOffset: 39, duration: 14, color: '#f59e0b' },
    { title: 'Sprint Planning', type: 'task', dayOffset: 39, duration: 1, color: '#f59e0b', parentIdx: 15 },
    { title: 'Feature Development', type: 'task', dayOffset: 40, duration: 10, color: '#f59e0b', parentIdx: 15 },
    { title: 'Code Review & QA', type: 'task', dayOffset: 48, duration: 3, color: '#f59e0b', parentIdx: 15 },
    { title: 'Sprint Review & Retro', type: 'task', dayOffset: 52, duration: 1, color: '#f59e0b', parentIdx: 15 },
    // 20: Release
    { title: 'Release Preparation', type: 'summary', dayOffset: 53, duration: 12, color: '#ef4444' },
    { title: 'Regression Testing', type: 'task', dayOffset: 53, duration: 5, color: '#ef4444', parentIdx: 20 },
    { title: 'Bug Fixes', type: 'task', dayOffset: 56, duration: 5, color: '#ef4444', parentIdx: 20 },
    { title: 'Documentation', type: 'task', dayOffset: 58, duration: 4, color: '#ef4444', parentIdx: 20 },
    { title: 'Release to Production', type: 'milestone', dayOffset: 65, duration: 0, color: '#8b5cf6', parentIdx: 20 },
  ],
  dependencies: [
    [1, 2], [2, 3], [3, 4], [4, 6],
    [6, 7], [7, 8], [8, 9], [9, 11],
    [11, 12], [12, 13], [13, 14], [14, 16],
    [16, 17], [17, 18], [18, 19], [19, 21],
    [21, 22], [22, 23], [23, 24],
  ],
};

const marketingCampaign: TemplateDefinition = {
  id: 'marketing-campaign',
  name: 'Marketing Campaign',
  description: 'End-to-end marketing campaign from strategy through post-launch analysis',
  icon: 'megaphone',
  tasks: [
    // 0: Strategy
    { title: 'Strategy & Research', type: 'summary', dayOffset: 0, duration: 14, color: '#3b82f6' },
    { title: 'Market Research', type: 'task', dayOffset: 0, duration: 7, color: '#3b82f6', parentIdx: 0 },
    { title: 'Target Audience Analysis', type: 'task', dayOffset: 5, duration: 5, color: '#3b82f6', parentIdx: 0 },
    { title: 'Campaign Strategy', type: 'task', dayOffset: 8, duration: 6, color: '#3b82f6', parentIdx: 0 },
    { title: 'Strategy Approval', type: 'milestone', dayOffset: 14, duration: 0, color: '#8b5cf6', parentIdx: 0 },
    // 5: Content
    { title: 'Content Creation', type: 'summary', dayOffset: 15, duration: 20, color: '#22c55e' },
    { title: 'Copywriting', type: 'task', dayOffset: 15, duration: 10, color: '#22c55e', parentIdx: 5 },
    { title: 'Design Assets', type: 'task', dayOffset: 15, duration: 12, color: '#22c55e', parentIdx: 5 },
    { title: 'Video Production', type: 'task', dayOffset: 18, duration: 14, color: '#22c55e', parentIdx: 5 },
    { title: 'Content Review', type: 'task', dayOffset: 32, duration: 3, color: '#22c55e', parentIdx: 5 },
    // 10: Pre-Launch
    { title: 'Pre-Launch', type: 'summary', dayOffset: 35, duration: 12, color: '#f59e0b' },
    { title: 'Media Buying', type: 'task', dayOffset: 35, duration: 5, color: '#f59e0b', parentIdx: 10 },
    { title: 'Influencer Outreach', type: 'task', dayOffset: 35, duration: 8, color: '#f59e0b', parentIdx: 10 },
    { title: 'Landing Pages', type: 'task', dayOffset: 37, duration: 7, color: '#f59e0b', parentIdx: 10 },
    { title: 'Campaign Ready', type: 'milestone', dayOffset: 47, duration: 0, color: '#8b5cf6', parentIdx: 10 },
    // 15: Launch
    { title: 'Launch', type: 'summary', dayOffset: 48, duration: 14, color: '#ef4444' },
    { title: 'Campaign Go-Live', type: 'task', dayOffset: 48, duration: 1, color: '#ef4444', parentIdx: 15 },
    { title: 'Social Media Push', type: 'task', dayOffset: 48, duration: 14, color: '#ef4444', parentIdx: 15 },
    { title: 'Email Campaign', type: 'task', dayOffset: 49, duration: 7, color: '#ef4444', parentIdx: 15 },
    { title: 'PR Distribution', type: 'task', dayOffset: 48, duration: 5, color: '#ef4444', parentIdx: 15 },
    // 20: Analysis
    { title: 'Post-Campaign Analysis', type: 'summary', dayOffset: 62, duration: 10, color: '#ec4899' },
    { title: 'Performance Tracking', type: 'task', dayOffset: 62, duration: 5, color: '#ec4899', parentIdx: 20 },
    { title: 'ROI Analysis', type: 'task', dayOffset: 65, duration: 5, color: '#ec4899', parentIdx: 20 },
    { title: 'Final Report', type: 'task', dayOffset: 68, duration: 4, color: '#ec4899', parentIdx: 20 },
  ],
  dependencies: [
    [1, 2], [2, 3], [3, 4], [4, 6],
    [6, 9], [7, 9], [8, 9], [9, 11],
    [9, 12], [9, 13], [11, 14], [13, 14], [14, 16],
    [16, 17], [16, 18], [16, 19], [17, 21],
    [21, 22], [22, 23],
  ],
};

const constructionProject: TemplateDefinition = {
  id: 'construction',
  name: 'Construction Project',
  description: 'Building construction from permits through handover',
  icon: 'building',
  tasks: [
    // 0: Pre-Construction
    { title: 'Pre-Construction', type: 'summary', dayOffset: 0, duration: 25, color: '#6366f1' },
    { title: 'Permits & Approvals', type: 'task', dayOffset: 0, duration: 15, color: '#6366f1', parentIdx: 0 },
    { title: 'Site Survey', type: 'task', dayOffset: 5, duration: 5, color: '#6366f1', parentIdx: 0 },
    { title: 'Material Procurement', type: 'task', dayOffset: 10, duration: 15, color: '#6366f1', parentIdx: 0 },
    { title: 'Pre-Construction Complete', type: 'milestone', dayOffset: 25, duration: 0, color: '#8b5cf6', parentIdx: 0 },
    // 5: Foundation
    { title: 'Foundation', type: 'summary', dayOffset: 26, duration: 20, color: '#f59e0b' },
    { title: 'Excavation', type: 'task', dayOffset: 26, duration: 7, color: '#f59e0b', parentIdx: 5 },
    { title: 'Foundation Pouring', type: 'task', dayOffset: 33, duration: 8, color: '#f59e0b', parentIdx: 5 },
    { title: 'Foundation Inspection', type: 'milestone', dayOffset: 46, duration: 0, color: '#8b5cf6', parentIdx: 5 },
    // 9: Structure
    { title: 'Structure', type: 'summary', dayOffset: 47, duration: 35, color: '#22c55e' },
    { title: 'Framing', type: 'task', dayOffset: 47, duration: 15, color: '#22c55e', parentIdx: 9 },
    { title: 'Roofing', type: 'task', dayOffset: 60, duration: 10, color: '#22c55e', parentIdx: 9 },
    { title: 'Exterior Finish', type: 'task', dayOffset: 68, duration: 14, color: '#22c55e', parentIdx: 9 },
    // 13: Interior
    { title: 'Interior', type: 'summary', dayOffset: 82, duration: 35, color: '#ef4444' },
    { title: 'Electrical', type: 'task', dayOffset: 82, duration: 12, color: '#ef4444', parentIdx: 13 },
    { title: 'Plumbing', type: 'task', dayOffset: 82, duration: 12, color: '#ef4444', parentIdx: 13 },
    { title: 'HVAC Installation', type: 'task', dayOffset: 88, duration: 10, color: '#ef4444', parentIdx: 13 },
    { title: 'Interior Finish', type: 'task', dayOffset: 98, duration: 19, color: '#ef4444', parentIdx: 13 },
    // 18: Completion
    { title: 'Completion', type: 'summary', dayOffset: 117, duration: 15, color: '#ec4899' },
    { title: 'Final Inspection', type: 'task', dayOffset: 117, duration: 5, color: '#ec4899', parentIdx: 18 },
    { title: 'Punch List', type: 'task', dayOffset: 122, duration: 7, color: '#ec4899', parentIdx: 18 },
    { title: 'Handover', type: 'milestone', dayOffset: 132, duration: 0, color: '#8b5cf6', parentIdx: 18 },
  ],
  dependencies: [
    [1, 2], [2, 3], [3, 4], [4, 6],
    [6, 7], [7, 8], [8, 10],
    [10, 11], [11, 12], [12, 14],
    [12, 15], [14, 16], [15, 16], [16, 17], [17, 19],
    [19, 20], [20, 21],
  ],
};

const eventPlanning: TemplateDefinition = {
  id: 'event-planning',
  name: 'Event Planning',
  description: 'Conference or large event from concept through post-event wrap-up',
  icon: 'calendar',
  tasks: [
    // 0: Concept
    { title: 'Concept & Planning', type: 'summary', dayOffset: 0, duration: 14, color: '#3b82f6' },
    { title: 'Define Event Goals', type: 'task', dayOffset: 0, duration: 3, color: '#3b82f6', parentIdx: 0 },
    { title: 'Budget Planning', type: 'task', dayOffset: 2, duration: 5, color: '#3b82f6', parentIdx: 0 },
    { title: 'Theme & Branding', type: 'task', dayOffset: 5, duration: 7, color: '#3b82f6', parentIdx: 0 },
    { title: 'Plan Approved', type: 'milestone', dayOffset: 14, duration: 0, color: '#8b5cf6', parentIdx: 0 },
    // 5: Venue & Logistics
    { title: 'Venue & Logistics', type: 'summary', dayOffset: 15, duration: 20, color: '#22c55e' },
    { title: 'Venue Selection & Booking', type: 'task', dayOffset: 15, duration: 10, color: '#22c55e', parentIdx: 5 },
    { title: 'Catering & Services', type: 'task', dayOffset: 22, duration: 8, color: '#22c55e', parentIdx: 5 },
    { title: 'AV & Technical Setup', type: 'task', dayOffset: 25, duration: 7, color: '#22c55e', parentIdx: 5 },
    { title: 'Logistics Confirmed', type: 'milestone', dayOffset: 35, duration: 0, color: '#8b5cf6', parentIdx: 5 },
    // 10: Marketing
    { title: 'Marketing & Promotion', type: 'summary', dayOffset: 20, duration: 30, color: '#f59e0b' },
    { title: 'Website & Registration', type: 'task', dayOffset: 20, duration: 10, color: '#f59e0b', parentIdx: 10 },
    { title: 'Email Campaigns', type: 'task', dayOffset: 28, duration: 15, color: '#f59e0b', parentIdx: 10 },
    { title: 'Social Media Promotion', type: 'task', dayOffset: 25, duration: 25, color: '#f59e0b', parentIdx: 10 },
    // 14: Speakers
    { title: 'Speakers & Content', type: 'summary', dayOffset: 15, duration: 35, color: '#06b6d4' },
    { title: 'Speaker Invitations', type: 'task', dayOffset: 15, duration: 10, color: '#06b6d4', parentIdx: 14 },
    { title: 'Agenda Planning', type: 'task', dayOffset: 25, duration: 10, color: '#06b6d4', parentIdx: 14 },
    { title: 'Content Review', type: 'task', dayOffset: 40, duration: 10, color: '#06b6d4', parentIdx: 14 },
    // 18: Event Execution
    { title: 'Event Execution', type: 'summary', dayOffset: 55, duration: 3, color: '#ef4444' },
    { title: 'Setup & Rehearsal', type: 'task', dayOffset: 55, duration: 1, color: '#ef4444', parentIdx: 18 },
    { title: 'Event Day(s)', type: 'task', dayOffset: 56, duration: 2, color: '#ef4444', parentIdx: 18 },
    // 21: Post-Event
    { title: 'Post-Event', type: 'summary', dayOffset: 58, duration: 10, color: '#ec4899' },
    { title: 'Attendee Follow-up', type: 'task', dayOffset: 58, duration: 5, color: '#ec4899', parentIdx: 21 },
    { title: 'ROI & Feedback Analysis', type: 'task', dayOffset: 61, duration: 7, color: '#ec4899', parentIdx: 21 },
  ],
  dependencies: [
    [1, 2], [2, 3], [3, 4], [4, 6],
    [6, 7], [7, 8], [8, 9],
    [4, 11], [11, 12], [11, 13],
    [4, 15], [15, 16], [16, 17],
    [9, 19], [17, 19], [19, 20], [20, 22], [22, 23],
  ],
};

const productLaunch: TemplateDefinition = {
  id: 'product-launch',
  name: 'Product Launch',
  description: 'New product launch from research through post-launch growth',
  icon: 'rocket',
  tasks: [
    // 0: Research
    { title: 'Research & Validation', type: 'summary', dayOffset: 0, duration: 18, color: '#3b82f6' },
    { title: 'Market Research', type: 'task', dayOffset: 0, duration: 8, color: '#3b82f6', parentIdx: 0 },
    { title: 'Competitive Analysis', type: 'task', dayOffset: 5, duration: 6, color: '#3b82f6', parentIdx: 0 },
    { title: 'Product Strategy', type: 'task', dayOffset: 10, duration: 8, color: '#3b82f6', parentIdx: 0 },
    { title: 'Strategy Approved', type: 'milestone', dayOffset: 18, duration: 0, color: '#8b5cf6', parentIdx: 0 },
    // 5: Development
    { title: 'Product Development', type: 'summary', dayOffset: 19, duration: 40, color: '#22c55e' },
    { title: 'MVP Development', type: 'task', dayOffset: 19, duration: 25, color: '#22c55e', parentIdx: 5 },
    { title: 'Beta Testing', type: 'task', dayOffset: 40, duration: 10, color: '#22c55e', parentIdx: 5 },
    { title: 'Bug Fixes & Polish', type: 'task', dayOffset: 48, duration: 11, color: '#22c55e', parentIdx: 5 },
    { title: 'Product Ready', type: 'milestone', dayOffset: 59, duration: 0, color: '#8b5cf6', parentIdx: 5 },
    // 10: Marketing Prep
    { title: 'Marketing Prep', type: 'summary', dayOffset: 35, duration: 25, color: '#f59e0b' },
    { title: 'Brand Messaging', type: 'task', dayOffset: 35, duration: 8, color: '#f59e0b', parentIdx: 10 },
    { title: 'Press Kit & Media', type: 'task', dayOffset: 40, duration: 10, color: '#f59e0b', parentIdx: 10 },
    { title: 'Marketing Materials', type: 'task', dayOffset: 45, duration: 12, color: '#f59e0b', parentIdx: 10 },
    { title: 'Launch Website Ready', type: 'milestone', dayOffset: 60, duration: 0, color: '#8b5cf6', parentIdx: 10 },
    // 15: Launch
    { title: 'Launch', type: 'summary', dayOffset: 60, duration: 8, color: '#ef4444' },
    { title: 'Soft Launch (Beta)', type: 'task', dayOffset: 60, duration: 3, color: '#ef4444', parentIdx: 15 },
    { title: 'Full Launch', type: 'task', dayOffset: 63, duration: 1, color: '#ef4444', parentIdx: 15 },
    { title: 'PR & Announcements', type: 'task', dayOffset: 63, duration: 5, color: '#ef4444', parentIdx: 15 },
    // 19: Post-Launch
    { title: 'Post-Launch', type: 'summary', dayOffset: 68, duration: 20, color: '#ec4899' },
    { title: 'User Feedback Collection', type: 'task', dayOffset: 68, duration: 10, color: '#ec4899', parentIdx: 19 },
    { title: 'Iteration & Improvements', type: 'task', dayOffset: 75, duration: 13, color: '#ec4899', parentIdx: 19 },
    { title: 'Growth Marketing', type: 'task', dayOffset: 73, duration: 15, color: '#ec4899', parentIdx: 19 },
  ],
  dependencies: [
    [1, 2], [2, 3], [3, 4], [4, 6],
    [6, 7], [7, 8], [8, 9],
    [6, 11], [11, 12], [12, 13], [13, 14],
    [9, 16], [14, 16], [16, 17], [17, 18],
    [17, 20], [20, 21], [20, 22],
  ],
};

export const PROJECT_TEMPLATES: TemplateDefinition[] = [
  itProjectPlan,
  agileSoftware,
  marketingCampaign,
  productLaunch,
  eventPlanning,
  constructionProject,
];

export function createProjectFromTemplate(
  templateId: string | null,
  projectName: string,
  projectDesc: string,
  startDate: Date,
  createdBy: string,
): ProjectData {
  if (!templateId) {
    // Blank project
    const projectId = uuidv4();
    const now = toISO(new Date());
    return {
      project: {
        id: projectId,
        workspaceId: 'ws-1',
        name: projectName,
        description: projectDesc,
        startDate: toISO(startDate),
        endDate: toISO(addDays(startDate, 90)),
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

  const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return createProjectFromTemplate(null, projectName, projectDesc, startDate, createdBy);
  }

  return buildProjectData(template, projectName, projectDesc, startDate, createdBy);
}
