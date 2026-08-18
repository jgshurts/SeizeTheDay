import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { parseDateParam } from "../lib/date";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

// Default sort order: status.statusCode, priorityGroup.prty, then the task's
// own prtyOrdinal (application.md calls this "Task.prty").
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
    include: { status: true, priorityGroup: true, note: true, project: true },
    orderBy: [
      { status: { statusCode: "asc" } },
      { priorityGroup: { prty: "asc" } },
      { prtyOrdinal: "asc" },
    ],
  });

  res.json(tasks);
});

tasksRouter.post("/", async (req: AuthedRequest, res) => {
  const {
    description,
    datePlanned,
    projectId,
    priorityGroupId,
    statusId,
    prtyOrdinal,
    assigneeId,
    noteId,
  } = req.body as Record<string, unknown>;

  const parsedDate = parseDateParam(datePlanned);
  if (!description || typeof description !== "string" || !parsedDate) {
    return res.status(400).json({ error: "description and datePlanned (YYYY-MM-DD) are required" });
  }

  const ownerId = BigInt(req.user!.userId);

  const task = await prisma.task.create({
    data: {
      description,
      datePlanned: parsedDate,
      ownerId,
      assigneeId: assigneeId ? BigInt(assigneeId as string) : ownerId,
      projectId: projectId ? BigInt(projectId as string) : null,
      priorityGroupId: priorityGroupId ? BigInt(priorityGroupId as string) : null,
      statusId: statusId ? BigInt(statusId as string) : null,
      prtyOrdinal: typeof prtyOrdinal === "number" ? prtyOrdinal : null,
      noteId: noteId ? BigInt(noteId as string) : null,
    },
    include: { status: true, priorityGroup: true, note: true, project: true },
  });

  res.status(201).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const { description, datePlanned, projectId, priorityGroupId, statusId, prtyOrdinal, assigneeId } =
    req.body as Record<string, unknown>;

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
      ...completedAtUpdate,
    },
    include: { status: true, priorityGroup: true, note: true, project: true },
  });

  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.task.delete({ where: { id } });
  res.status(204).send();
});
