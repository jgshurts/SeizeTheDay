import { NextFunction, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { AuthedRequest } from "../middleware/requireAuth";

// The one place that decides whose data a request can touch. Every route
// that reads or writes tasks, notes or projects goes through these rather
// than building its own owner condition, so a new endpoint can't quietly
// forget one.

export function currentUserId(req: AuthedRequest): bigint {
  return BigInt(req.user!.userId);
}

// A user sees the tasks they own, plus tasks delegated to them.
export function visibleTasksWhere(userId: bigint): Prisma.TaskWhereInput {
  return { OR: [{ ownerId: userId }, { assigneeId: userId }] };
}

// Fields the assignee of a delegated task may change; everything else
// (description, project, assignee, blocker note, deletion) stays with the
// owner.
export const ASSIGNEE_EDITABLE_TASK_FIELDS = new Set([
  "statusId",
  "datePlanned",
  "priorityGroupId",
  "prtyOrdinal",
]);

export type TaskAccess = "owner" | "assignee" | null;

export function taskAccess(task: { ownerId: bigint; assigneeId: bigint }, userId: bigint): TaskAccess {
  if (task.ownerId === userId) return "owner";
  if (task.assigneeId === userId) return "assignee";
  return null;
}

// Same pattern as the client's NOTE_REF_PATTERN (client/src/lib/noteRefs.ts):
// "@REF", not preceded by an id-like character.
const NOTE_REF_PATTERN = /(?<![A-Za-z0-9_])@([A-Za-z0-9_.-]{1,10})/g;

function descriptionReferences(description: string, shortRef: string): boolean {
  const target = shortRef.toLowerCase();
  for (const match of description.matchAll(NOTE_REF_PATTERN)) {
    if (match[1].toLowerCase() === target) return true;
  }
  return false;
}

export type NoteAccess = "owner" | "linked" | null;

// A note is visible to its owner, and to the assignee of any task delegated
// to them that links it -- as the task's blocker note, or by "@REF" in its
// description. A linked note can be read and its text edited, nothing more.
export async function noteAccess(
  note: { id: bigint; ownerId: bigint; shortRef: string | null },
  userId: bigint,
): Promise<NoteAccess> {
  if (note.ownerId === userId) return "owner";

  const candidates = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      OR: [
        { blockerNoteId: note.id },
        ...(note.shortRef
          ? [{ description: { contains: `@${note.shortRef}`, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: { blockerNoteId: true, description: true },
  });

  const linked = candidates.some(
    (t) =>
      t.blockerNoteId === note.id ||
      (note.shortRef !== null && descriptionReferences(t.description, note.shortRef)),
  );
  return linked ? "linked" : null;
}

// Throws-free check for a project id arriving in a request body: null/empty
// is always fine (no project); otherwise it must be one of the user's own.
export async function isOwnProjectId(projectId: unknown, userId: bigint): Promise<boolean> {
  if (projectId === null || projectId === undefined || projectId === "") return true;
  if (typeof projectId !== "string" && typeof projectId !== "number") return false;
  let id: bigint;
  try {
    id = BigInt(projectId);
  } catch {
    return false;
  }
  const project = await prisma.project.findFirst({ where: { id, ownerId: userId }, select: { id: true } });
  return project !== null;
}

// Guards the shared, admin-managed settings (Statuses, Priority Groups,
// Users). Checked against the database rather than trusting a flag in the
// JWT, so revoking admin takes effect immediately.
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId(req) },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
