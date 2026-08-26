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
    res.json(events);
  }),
);
