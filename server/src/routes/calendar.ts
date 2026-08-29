import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { parseDateParam } from "../lib/date";
import { getEventsForDate } from "../lib/googleCalendar";

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

calendarRouter.get(
  "/events",
  asyncHandler(async (req: AuthedRequest, res) => {
    const dateKey = req.query.date;
    if (typeof dateKey !== "string" || !parseDateParam(dateKey)) {
      res.status(400).json({ error: "Query param 'date' must be YYYY-MM-DD" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: BigInt(req.user!.userId) } });
    if (!user?.googleRefreshToken) {
      res.status(409).json({ error: "Calendar not connected. Sign out and sign in again to grant access." });
      return;
    }

    const events = await getEventsForDate(user.googleRefreshToken, dateKey);

    const tags = await prisma.eventProjectTag.findMany({
      where: { userId: user.id, googleEventId: { in: events.map((e) => e.id) } },
    });
    const projectIdByEventId = new Map(tags.map((t) => [t.googleEventId, t.projectId.toString()]));

    res.json(
      events.map((event) => ({
        ...event,
        projectId: projectIdByEventId.get(event.id) ?? null,
      })),
    );
  }),
);

// Tags (or clears, when projectId is null) a specific event with a Project
// so the Schedule column can color it -- see EventProjectTag in schema.prisma.
calendarRouter.patch(
  "/events/:eventId/project",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { projectId } = req.body as { projectId?: string | null };
    const userId = BigInt(req.user!.userId);
    const googleEventId = req.params.eventId;

    if (!projectId) {
      await prisma.eventProjectTag.deleteMany({ where: { userId, googleEventId } });
      res.json({ googleEventId, projectId: null });
      return;
    }

    const tag = await prisma.eventProjectTag.upsert({
      where: { userId_googleEventId: { userId, googleEventId } },
      update: { projectId: BigInt(projectId) },
      create: { userId, googleEventId, projectId: BigInt(projectId) },
    });
    res.json({ googleEventId: tag.googleEventId, projectId: tag.projectId.toString() });
  }),
);
