export interface User {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
}

export interface Status {
  id: string;
  statusCode: string;
  isComplete: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  description: string | null;
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
}

export interface Task {
  id: string;
  projectId: string | null;
  ownerId: string;
  assigneeId: string;
  priorityGroupId: string | null;
  statusId: string | null;
  prtyOrdinal: number | null;
  description: string;
  createdAt: string;
  datePlanned: string;
  completedAt: string | null;
  status: Status | null;
  priorityGroup: PriorityGroup | null;
}

export interface Note {
  id: string;
  projectId: string | null;
  shortRef: string | null;
  noteText: string | null;
  createdAt: string;
  project: Project | null;
}
