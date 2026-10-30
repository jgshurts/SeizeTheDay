import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { parseDateParam } from "../lib/date";
import { CalendarFeedError, checkFeed, forgetFeed, getEventsForDate } from "../lib/icalCalendar";
import { isOwnProjectId } from "../lib/access";

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

// Whether a calendar is connected -- the address itself is a secret that
// grants read access to the whole calendar, so it is never sent back.
calendarRouter.get(
  "/settings",
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user!.userId) },
      select: { calendarIcalUrl: true },
    });
    res.json({ connected: Boolean(user?.calendarIcalUrl) });
  }),
);

// Saves (or, with icalUrl null, removes) the user's private iCal address.
// The address is fetched and parsed first, so a typo is caught here rather
// than showing up later as an empty Schedule column.
calendarRouter.put(
  "/settings",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { icalUrl } = req.body as { icalUrl?: unknown };
    const id = BigInt(req.user!.userId);

    if (icalUrl === null) {
      const prev = await prisma.user.findUnique({ where: { id }, select: { calendarIcalUrl: true } });
      if (prev?.calendarIcalUrl) forgetFeed(prev.calendarIcalUrl);
      await prisma.user.update({ where: { id }, data: { calendarIcalUrl: null } });
      res.json({ connected: false });
      return;
    }
    if (typeof icalUrl !== "string" || !icalUrl.trim()) {
      res.status(400).json({ error: "icalUrl must be a web address, or null to disconnect" });
      return;
    }

    try {
      const url = await checkFeed(icalUrl);
      await prisma.user.update({ where: { id }, data: { calendarIcalUrl: url } });
      res.json({ connected: true });
    } catch (err) {
      if (err instanceof CalendarFeedError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

calendarRouter.get(
  "/events",
  asyncHandler(async (req: AuthedRequest, res) => {
    const dateKey = req.query.date;
    if (typeof dateKey !== "string" || !parseDateParam(dateKey)) {
      res.status(400).json({ error: "Query param 'date' must be YYYY-MM-DD" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: BigInt(req.user!.userId) } });
    if (!user?.calendarIcalUrl) {
      res.status(409).json({ error: "No calendar connected. Add one in Settings > Calendar." });
      return;
    }

    let events;
    try {
      events = await getEventsForDate(user.calendarIcalUrl, dateKey, { fresh: req.query.fresh === "1" });
    } catch (err) {
      if (err instanceof CalendarFeedError) {
        res.status(409).json({ error: err.message });
        return;
      }
      throw err;
    }

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
    if (!(await isOwnProjectId(projectId, userId))) {
      res.status(400).json({ error: "Unknown project" });
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
