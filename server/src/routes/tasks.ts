import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { parseDateParam } from "../lib/date";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

// Default sort order: status.ordinal (lets completed statuses sort to the
// bottom regardless of their code), priorityGroup.prty, then the task's own
// prtyOrdinal (application.md calls this "Task.prty").
tasksRouter.get("/", async (req, res) => {
  const datePlanned = parseDateParam(req.query.date);
  if (!datePlanned) {
    return res.status(400).json({ error: "Query param 'date' must be YYYY-MM-DD" });
  }
  const includeCompleted = req.query.includeCompleted !== "false";
  const { projectId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      datePlanned,
      ...(includeCompleted ? {} : { OR: [{ status: null }, { status: { isComplete: false } }] }),
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: { status: true, priorityGroup: true, blockerNote: true, project: true },
    orderBy: [
      { status: { ordinal: "asc" } },
      { priorityGroup: { prty: "asc" } },
      { prtyOrdinal: "asc" },
    ],
  });

  res.json(tasks);
});

// Completed-tasks report: every task marked complete, regardless of
// datePlanned, for the Settings > Completed Tasks export. Sorted by
// completedAt (most recent first) then the same priorityGroup/prty order
// as the daily view, so the default table/export order matches what the
// user expects without any client-side re-sort.
tasksRouter.get("/completed", async (req, res) => {
  const { projectId, startDate, endDate } = req.query;

  const start = parseDateParam(startDate);
  const end = parseDateParam(endDate);
  if ((startDate && !start) || (endDate && !end)) {
    return res.status(400).json({ error: "startDate/endDate must be YYYY-MM-DD" });
  }
  // end is inclusive of the whole calendar day, so the range's upper bound
  // is the start of the following day.
  const endExclusive = end ? new Date(end.getTime() + 24 * 60 * 60 * 1000) : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      completedAt: {
        not: null,
        ...(start ? { gte: start } : {}),
        ...(endExclusive ? { lt: endExclusive } : {}),
      },
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: { status: true, priorityGroup: true, blockerNote: true, project: true },
    orderBy: [
      { completedAt: "desc" },
      { priorityGroup: { prty: "asc" } },
      { prtyOrdinal: "asc" },
    ],
  });

  res.json(tasks);
});

tasksRouter.post("/", async (req: AuthedRequest, res) => {
  const { description, datePlanned, projectId, priorityGroupId, statusId, prtyOrdinal, assigneeId } =
    req.body as Record<string, unknown>;

  const parsedDate = parseDateParam(datePlanned);
  if (!description || typeof description !== "string" || !parsedDate) {
    return res.status(400).json({ error: "description and datePlanned (YYYY-MM-DD) are required" });
  }

  const ownerId = BigInt(req.user!.userId);

  // New tasks without an explicit status fall back to whichever status is
  // marked default (e.g. "Not Started"), rather than having no status at
  // all -- a null status sorts last regardless of intent, which defeats the
  // point of an explicit "not started" ordinal.
  let resolvedStatusId = statusId ? BigInt(statusId as string) : null;
  if (!statusId) {
    const defaultStatus = await prisma.status.findFirst({ where: { isDefault: true } });
    resolvedStatusId = defaultStatus?.id ?? null;
  }

  const task = await prisma.task.create({
    data: {
      description,
      datePlanned: parsedDate,
      ownerId,
      assigneeId: assigneeId ? BigInt(assigneeId as string) : ownerId,
      projectId: projectId ? BigInt(projectId as string) : null,
      priorityGroupId: priorityGroupId ? BigInt(priorityGroupId as string) : null,
      statusId: resolvedStatusId,
      prtyOrdinal: typeof prtyOrdinal === "number" ? prtyOrdinal : null,
    },
    include: { status: true, priorityGroup: true, blockerNote: true, project: true },
  });

  res.status(201).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const {
    description,
    datePlanned,
    projectId,
    priorityGroupId,
    statusId,
    prtyOrdinal,
    assigneeId,
    blockerNoteId,
  } = req.body as Record<string, unknown>;

  let completedAtUpdate: { completedAt: Date | null } | Record<string, never> = {};
  if (statusId !== undefined) {
    const newStatus = statusId
      ? await prisma.status.findUnique({ where: { id: BigInt(statusId as string) } })
      : null;
    completedAtUpdate = { completedAt: newStatus?.isComplete ? new Date() : null };
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(description !== undefined ? { description: description as string } : {}),
      ...(datePlanned !== undefined ? { datePlanned: parseDateParam(datePlanned) ?? undefined } : {}),
      ...(projectId !== undefined ? { projectId: projectId ? BigInt(projectId as string) : null } : {}),
      ...(priorityGroupId !== undefined
        ? { priorityGroupId: priorityGroupId ? BigInt(priorityGroupId as string) : null }
        : {}),
      ...(statusId !== undefined ? { statusId: statusId ? BigInt(statusId as string) : null } : {}),
      ...(prtyOrdinal !== undefined ? { prtyOrdinal: prtyOrdinal as number | null } : {}),
      ...(assigneeId !== undefined ? { assigneeId: BigInt(assigneeId as string) } : {}),
      ...(blockerNoteId !== undefined
        ? { blockerNoteId: blockerNoteId ? BigInt(blockerNoteId as string) : null }
        : {}),
      ...completedAtUpdate,
    },
    include: { status: true, priorityGroup: true, blockerNote: true, project: true },
  });

  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.task.delete({ where: { id } });
  res.status(204).send();
});
