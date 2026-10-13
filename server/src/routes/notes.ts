import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { parseDateParam } from "../lib/date";
import { projectIdFilter } from "../lib/projectFilter";
import { generateUniqueShortRef } from "../lib/noteRefs";
import { asyncHandler } from "../lib/asyncHandler";
import { currentUserId, isOwnProjectId, noteAccess } from "../lib/access";

export const notesRouter = Router();
notesRouter.use(requireAuth);

// Notes are scoped to the planner date active when they were written
// (context_date), but still read back in write order (created_at asc) --
// like lines on a physical page. Only the user's own notes appear on their
// day page; a note linked from a task delegated to them is reached through
// that link (by-ref below) instead.
notesRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const contextDate = parseDateParam(req.query.date);
    if (!contextDate) {
      res.status(400).json({ error: "Query param 'date' must be YYYY-MM-DD" });
      return;
    }
    const { projectId } = req.query;

    const notes = await prisma.note.findMany({
      where: {
        ownerId: currentUserId(req),
        contextDate,
        ...projectIdFilter(projectId),
      },
      include: { project: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(notes);
  }),
);

// Resolves an "@REF" reference (see client's noteRefs.ts) to a note.
// short_ref has no database-level uniqueness constraint -- older rows from
// before refs were auto-generated may still collide -- so this resolves to
// the most recently created matching note the user is allowed to see.
notesRouter.get(
  "/by-ref/:shortRef",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = currentUserId(req);
    const candidates = await prisma.note.findMany({
      where: { shortRef: { equals: req.params.shortRef, mode: "insensitive" } },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
    for (const note of candidates) {
      if (await noteAccess(note, userId)) {
        res.json(note);
        return;
      }
    }
    res.status(404).json({ error: "No note found for that reference" });
  }),
);

notesRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { projectId, noteText, contextDate } = req.body as Record<string, unknown>;
    const ownerId = currentUserId(req);

    const parsedContextDate = parseDateParam(contextDate);
    if (!parsedContextDate) {
      res.status(400).json({ error: "contextDate (YYYY-MM-DD) is required" });
      return;
    }
    if (!(await isOwnProjectId(projectId, ownerId))) {
      res.status(400).json({ error: "Unknown project" });
      return;
    }

    const note = await prisma.note.create({
      data: {
        ownerId,
        projectId: projectId ? BigInt(projectId as string) : null,
        shortRef: await generateUniqueShortRef(),
        noteText: (noteText as string | undefined) ?? null,
        contextDate: parsedContextDate,
      },
      include: { project: true },
    });

    res.status(201).json(note);
  }),
);

// created_at and short_ref are both immutable by design -- the ref is
// generated once at creation so links to it never go stale; only project
// and noteText can change. Someone seeing the note through a delegated
// task's link may edit its text, but its project stays the owner's call.
notesRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = BigInt(req.params.id);
    const userId = currentUserId(req);
    const { projectId, noteText } = req.body as Record<string, unknown>;

    const existing = await prisma.note.findUnique({ where: { id } });
    const access = existing ? await noteAccess(existing, userId) : null;
    if (!access) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    if (projectId !== undefined) {
      if (access !== "owner") {
        res.status(403).json({ error: "Only the note's owner can change its project" });
        return;
      }
      if (!(await isOwnProjectId(projectId, userId))) {
        res.status(400).json({ error: "Unknown project" });
        return;
      }
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(projectId !== undefined ? { projectId: projectId ? BigInt(projectId as string) : null } : {}),
        ...(noteText !== undefined ? { noteText: noteText as string | null } : {}),
      },
      include: { project: true },
    });

    res.json(note);
  }),
);

notesRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = BigInt(req.params.id);
    const existing = await prisma.note.findUnique({ where: { id } });
    const access = existing ? await noteAccess(existing, currentUserId(req)) : null;
    if (!access) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    if (access !== "owner") {
      res.status(403).json({ error: "Only the note's owner can delete it" });
      return;
    }
    await prisma.note.delete({ where: { id } });
    res.status(204).send();
  }),
);
