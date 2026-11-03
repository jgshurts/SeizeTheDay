import { Router } from "express";
import type { RecurringTask } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { parseDateParam } from "../lib/date";
import { currentUserId, isOwnProjectId } from "../lib/access";
import { RecurrenceRule, validateRule } from "../lib/recurrence";
import {
  deleteUpcomingOccurrences,
  ruleOf,
  syncRecurringTasks,
  toDateKey,
} from "../lib/recurringTasks";

export const recurringTasksRouter = Router();
recurringTasksRouter.use(requireAuth);

// Dates go out as plain YYYY-MM-DD keys, the same form the browser sends.
function present(series: RecurringTask) {
  return {
    id: series.id,
    description: series.description,
    projectId: series.projectId,
    priorityGroupId: series.priorityGroupId,
    skipIfMissed: series.skipIfMissed,
    ...ruleOf(series),
  };
}

const TODAY_ERROR = { error: "today (the browser's local date, YYYY-MM-DD) is required" };

// The browser calls this when the app opens and when the date rolls over,
// so tomorrow's trash day exists without a scheduled job on the server.
recurringTasksRouter.post(
  "/sync",
  asyncHandler(async (req: AuthedRequest, res) => {
    const today = (req.body as Record<string, unknown>).today;
    if (!parseDateParam(today)) {
      res.status(400).json(TODAY_ERROR);
      return;
    }
    const created = await syncRecurringTasks(currentUserId(req), today as string);
    res.json({ created });
  }),
);

recurringTasksRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const all = await prisma.recurringTask.findMany({
      where: { ownerId: currentUserId(req) },
      orderBy: [{ description: "asc" }, { id: "asc" }],
    });
    res.json(all.map(present));
  }),
);

// Checks the parts of a body that aren't the repeat rule itself.
async function checkDetails(body: Record<string, unknown>, userId: bigint): Promise<string | null> {
  if (body.description !== undefined && (typeof body.description !== "string" || !body.description.trim())) {
    return "description is required";
  }
  if (body.projectId !== undefined && !(await isOwnProjectId(body.projectId, userId))) {
    return "Unknown project";
  }
  const pg = body.priorityGroupId;
  if (pg !== undefined && pg !== null && pg !== "") {
    const found = await prisma.priorityGroup.findUnique({ where: { id: BigInt(pg as string) } }).catch(() => null);
    if (!found) return "Unknown priority group";
  }
  return null;
}

const idOrNull = (v: unknown) => (v ? BigInt(v as string) : null);

recurringTasksRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const userId = currentUserId(req);

    if (!parseDateParam(body.today)) {
      res.status(400).json(TODAY_ERROR);
      return;
    }
    if (typeof body.description !== "string" || !body.description.trim()) {
      res.status(400).json({ error: "description is required" });
      return;
    }
    const detailsError = await checkDetails(body, userId);
    if (detailsError) {
      res.status(400).json({ error: detailsError });
      return;
    }
    const checked = validateRule(body);
    if ("error" in checked) {
      res.status(400).json({ error: checked.error });
      return;
    }
    const { rule } = checked;

    const series = await prisma.recurringTask.create({
      data: {
        ownerId: userId,
        description: body.description.trim(),
        projectId: idOrNull(body.projectId),
        priorityGroupId: idOrNull(body.priorityGroupId),
        skipIfMissed: body.skipIfMissed === true,
        frequency: rule.frequency,
        interval: rule.interval,
        weekdays: rule.weekdays,
        monthDay: rule.monthDay,
        month: rule.month,
        startDate: parseDateParam(rule.startDate)!,
        endDate: rule.endDate ? parseDateParam(rule.endDate)! : null,
      },
    });
    await syncRecurringTasks(userId, body.today as string, series.id);

    res.status(201).json(present(await prisma.recurringTask.findUniqueOrThrow({ where: { id: series.id } })));
  }),
);

recurringTasksRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const userId = currentUserId(req);
    const id = BigInt(req.params.id);

    if (!parseDateParam(body.today)) {
      res.status(400).json(TODAY_ERROR);
      return;
    }
    const existing = await prisma.recurringTask.findFirst({ where: { id, ownerId: userId } });
    if (!existing) {
      res.status(404).json({ error: "Recurring task not found" });
      return;
    }
    const detailsError = await checkDetails(body, userId);
    if (detailsError) {
      res.status(400).json({ error: detailsError });
      return;
    }

    // Anything not sent keeps its current value, then the whole rule is
    // re-checked together.
    const merged: Record<string, unknown> = { ...ruleOf(existing), ...body };
    const checked = validateRule(merged);
    if ("error" in checked) {
      res.status(400).json({ error: checked.error });
      return;
    }
    const { rule } = checked;

    const scheduleChanged = (Object.keys(rule) as (keyof RecurrenceRule)[]).some(
      (k) => JSON.stringify(rule[k]) !== JSON.stringify(ruleOf(existing)[k]),
    );

    const description = typeof body.description === "string" ? body.description.trim() : existing.description;
    const projectId = body.projectId !== undefined ? idOrNull(body.projectId) : existing.projectId;
    const priorityGroupId =
      body.priorityGroupId !== undefined ? idOrNull(body.priorityGroupId) : existing.priorityGroupId;

    await prisma.recurringTask.update({
      where: { id },
      data: {
        description,
        projectId,
        priorityGroupId,
        skipIfMissed: typeof body.skipIfMissed === "boolean" ? body.skipIfMissed : existing.skipIfMissed,
        frequency: rule.frequency,
        interval: rule.interval,
        weekdays: rule.weekdays,
        monthDay: rule.monthDay,
        month: rule.month,
        startDate: parseDateParam(rule.startDate)!,
        endDate: rule.endDate ? parseDateParam(rule.endDate)! : null,
        ...(scheduleChanged ? { generatedThrough: null } : {}),
      },
    });

    if (scheduleChanged) {
      // The days changed, so the upcoming ones are stale: clear what hasn't
      // been done and lay them out again from the new rule.
      await deleteUpcomingOccurrences(id, body.today as string);
    } else {
      // Same days -- just carry the new wording, project or priority over to
      // the upcoming occurrences, leaving any edits to status or date alone.
      await prisma.task.updateMany({
        where: {
          seriesId: id,
          datePlanned: { gte: parseDateParam(body.today)! },
          OR: [{ status: null }, { status: { isComplete: false } }],
        },
        data: { description, projectId, priorityGroupId },
      });
    }
    await syncRecurringTasks(userId, body.today as string, id);

    res.json(present(await prisma.recurringTask.findUniqueOrThrow({ where: { id } })));
  }),
);

// Stops the series: upcoming unfinished occurrences go; finished and past
// ones stay as ordinary tasks.
recurringTasksRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = BigInt(req.params.id);
    const today = req.query.today;
    if (!parseDateParam(today)) {
      res.status(400).json(TODAY_ERROR);
      return;
    }
    const existing = await prisma.recurringTask.findFirst({ where: { id, ownerId: currentUserId(req) } });
    if (!existing) {
      res.status(404).json({ error: "Recurring task not found" });
      return;
    }
    await deleteUpcomingOccurrences(id, today as string);
    await prisma.recurringTask.delete({ where: { id } });
    res.status(204).send();
  }),
);
