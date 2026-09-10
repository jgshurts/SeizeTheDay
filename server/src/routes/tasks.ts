import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { parseDateParam } from "../lib/date";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const TASK_INCLUDE = { status: true, priorityGroup: true, blockerNote: true, project: true } as const;

// "Incomplete" everywhere in this file means the same thing: no status at
// all, or an explicit status not flagged isComplete.
const INCOMPLETE_FILTER = { OR: [{ status: null }, { status: { isComplete: false } }] };

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
      ...(includeCompleted ? {} : INCOMPLETE_FILTER),
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: TASK_INCLUDE,
    orderBy: [
      { status: { ordinal: "asc" } },
      { priorityGroup: { prty: "asc" } },
      { prtyOrdinal: "asc" },
    ],
  });

  res.json(tasks);
});

// Every incomplete task left behind before a given date, regardless of how
// long ago it was planned -- lets a user who was away catch tasks that
// scrolled out of the single-day view entirely rather than hunting one day
// at a time. Oldest first, so the longest-neglected tasks surface at top.
tasksRouter.get("/unfinished", async (req, res) => {
  const before = parseDateParam(req.query.before);
  if (!before) {
    return res.status(400).json({ error: "Query param 'before' must be YYYY-MM-DD" });
  }
  const { projectId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      datePlanned: { lt: before },
      ...INCOMPLETE_FILTER,
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: TASK_INCLUDE,
    orderBy: [
      { datePlanned: "asc" },
      { priorityGroup: { prty: "asc" } },
      { prtyOrdinal: "asc" },
    ],
  });

  res.json(tasks);
});

// Free-text search across every task regardless of date, for finding one
// that's fallen out of view. Substring, case-insensitive.
tasksRouter.get("/search", async (req, res) => {
  const { q, projectId, includeCompleted } = req.query;
  if (typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ error: "Query param 'q' is required" });
  }

  const tasks = await prisma.task.findMany({
    where: {
      description: { contains: q.trim(), mode: "insensitive" },
      ...(includeCompleted === "false" ? INCOMPLETE_FILTER : {}),
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: TASK_INCLUDE,
    orderBy: [{ datePlanned: "desc" }],
    take: 200,
  });

  res.json(tasks);
});

// Task export report: tasks regardless of datePlanned, filtered by
// completion status, for the Task Export dialog. The date range filters on
// datePlanned (the one date every task actually has, and the field the rest
// of the app organizes around) rather than completedAt -- a task planned
// and completed the same local day can still land on the "wrong" side of a
// completedAt-based UTC range depending on time zone and time of day, which
// is confusing when every other date in this app means "planned for".
tasksRouter.get("/export", async (req, res) => {
  const { projectId, startDate, endDate, status } = req.query;

  if (status !== undefined && status !== "complete" && status !== "incomplete" && status !== "all") {
    return res.status(400).json({ error: "status must be 'complete', 'incomplete', or 'all'" });
  }
  const statusFilter =
    status === "incomplete" ? INCOMPLETE_FILTER : status === "all" ? {} : { completedAt: { not: null } };

  const start = parseDateParam(startDate);
  const end = parseDateParam(endDate);
  if ((startDate && !start) || (endDate && !end)) {
    return res.status(400).json({ error: "startDate/endDate must be YYYY-MM-DD" });
  }
  // end is inclusive of the whole calendar day, so the range's upper bound
  // is the start of the following day.
  const endExclusive = end ? new Date(end.getTime() + 24 * 60 * 60 * 1000) : undefined;
  const datePlannedFilter =
    start || endExclusive
      ? { datePlanned: { ...(start ? { gte: start } : {}), ...(endExclusive ? { lt: endExclusive } : {}) } }
      : {};

  const tasks = await prisma.task.findMany({
    where: {
      ...statusFilter,
      ...datePlannedFilter,
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: TASK_INCLUDE,
    orderBy: [
      { datePlanned: "desc" },
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
    include: TASK_INCLUDE,
  });

  res.status(201).json(task);
});

// Re-sorts a priority group's incomplete tasks on one day by their current
// prtyOrdinal, then compacts that ordering down to 1..N -- the "renumber"
// step that runs after a move so the destination day doesn't accumulate
// gaps or collisions from tasks arriving with ordinals from other days.
// Tasks with no prtyOrdinal set are left alone rather than pulled into the
// sequence, since a task without a priority value was never assigned one.
async function renumberPriorityGroup(datePlanned: Date, priorityGroupId: bigint) {
  const tasks = await prisma.task.findMany({
    where: {
      datePlanned,
      priorityGroupId,
      prtyOrdinal: { not: null },
      ...INCOMPLETE_FILTER,
    },
    orderBy: { prtyOrdinal: "asc" },
  });

  const updates = tasks
    .map((t, i) => ({ id: t.id, prtyOrdinal: i + 1 }))
    .filter((u, i) => u.prtyOrdinal !== tasks[i].prtyOrdinal);

  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((u) =>
      prisma.task.update({ where: { id: u.id }, data: { prtyOrdinal: u.prtyOrdinal } }),
    ),
  );
}

// On-demand version of the same renumber that a move triggers automatically
// -- lets the user tidy up a day's priority/ordinal gaps (e.g. after a bunch
// of manual PR edits or deletions) without having to move tasks off and back
// on to trigger it.
tasksRouter.post("/renumber", async (req, res) => {
  const datePlanned = parseDateParam(req.body?.date);
  if (!datePlanned) {
    return res.status(400).json({ error: "Body field 'date' must be YYYY-MM-DD" });
  }

  const groups = await prisma.task.findMany({
    where: {
      datePlanned,
      priorityGroupId: { not: null },
      prtyOrdinal: { not: null },
      ...INCOMPLETE_FILTER,
    },
    select: { priorityGroupId: true },
    distinct: ["priorityGroupId"],
  });

  for (const { priorityGroupId } of groups) {
    if (priorityGroupId) await renumberPriorityGroup(datePlanned, priorityGroupId);
  }

  res.status(204).send();
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

  const existing = datePlanned !== undefined ? await prisma.task.findUnique({ where: { id } }) : null;

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
    include: TASK_INCLUDE,
  });

  // A move onto a new day renumbers that day's priority group so the moved
  // task(s) slot in cleanly rather than piling up at whatever ordinal they
  // carried on their old day. Re-fetch afterward since the renumber may
  // have changed this very task's prtyOrdinal out from under the response.
  const movedToNewDate = existing && existing.datePlanned.getTime() !== task.datePlanned.getTime();
  if (movedToNewDate && task.priorityGroupId) {
    await renumberPriorityGroup(task.datePlanned, task.priorityGroupId);
    const refreshed = await prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    return res.json(refreshed);
  }

  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.task.delete({ where: { id } });
  res.status(204).send();
});
