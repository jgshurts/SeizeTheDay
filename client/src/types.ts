export interface User {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  themeBannerColor: string | null;
  themeSubBannerColor: string | null;
  themeBackgroundColor: string | null;
  themeLeftImage: string | null;
  themeRightImage: string | null;
  // Only present in the admin's Users list.
  hasPassword?: boolean;
  invitePending?: boolean;
}

// Another user as anyone may see them -- enough to delegate a task to them
// (GET /users returns more, including email, only to admins).
export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string | null;
  projectId: string | null;
}

export interface Status {
  id: string;
  statusCode: string;
  isComplete: boolean;
  isBlocked: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  description: string | null;
  ordinal: number;
  isDefault: boolean;
}

export interface PriorityGroup {
  id: string;
  prty: number;
  prtyCode: string;
  description: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  // Only populated by GET /projects (the Settings > Projects list) --
  // lets the delete confirmation warn before orphaning real tasks/notes.
  _count?: { tasks: number; notes: number };
}

export interface Task {
  id: string;
  projectId: string | null;
  ownerId: string;
  assigneeId: string;
  priorityGroupId: string | null;
  statusId: string | null;
  blockerNoteId: string | null;
  prtyOrdinal: number | null;
  description: string;
  createdAt: string;
  datePlanned: string;
  completedAt: string | null;
  status: Status | null;
  priorityGroup: PriorityGroup | null;
  blockerNote: { id: string; shortRef: string | null; noteText: string | null } | null;
  project: Project | null;
  owner: { id: string; nickname: string };
  assignee: { id: string; nickname: string };
}

export interface Note {
  id: string;
  ownerId: string;
  projectId: string | null;
  shortRef: string | null;
  noteText: string | null;
  createdAt: string;
  contextDate: string;
  project: Project | null;
}
