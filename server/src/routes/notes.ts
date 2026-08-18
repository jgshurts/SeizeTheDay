import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { parseDateParam } from "../lib/date";

export const notesRouter = Router();
notesRouter.use(requireAuth);

// Notes are scoped to the planner date active when they were written
// (context_date), but still read back in write order (created_at asc) --
// like lines on a physical page.
notesRouter.get("/", async (req, res) => {
  const contextDate = parseDateParam(req.query.date);
  if (!contextDate) {
    return res.status(400).json({ error: "Query param 'date' must be YYYY-MM-DD" });
  }

  const notes = await prisma.note.findMany({
    where: { contextDate },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(notes);
});

notesRouter.post("/", async (req, res) => {
  const { projectId, shortRef, noteText, contextDate } = req.body as Record<string, unknown>;

  const parsedContextDate = parseDateParam(contextDate);
  if (!parsedContextDate) {
    return res.status(400).json({ error: "contextDate (YYYY-MM-DD) is required" });
  }

  const note = await prisma.note.create({
    data: {
      projectId: projectId ? BigInt(projectId as string) : null,
      shortRef: (shortRef as string | undefined)?.slice(0, 10) ?? null,
      noteText: (noteText as string | undefined) ?? null,
      contextDate: parsedContextDate,
    },
    include: { project: true },
  });

  res.status(201).json(note);
});

// created_at is immutable by design; only project, shortRef, and noteText can change.
notesRouter.patch("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const { projectId, shortRef, noteText } = req.body as Record<string, unknown>;

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(projectId !== undefined ? { projectId: projectId ? BigInt(projectId as string) : null } : {}),
      ...(shortRef !== undefined ? { shortRef: (shortRef as string | null)?.slice(0, 10) ?? null } : {}),
      ...(noteText !== undefined ? { noteText: noteText as string | null } : {}),
    },
    include: { project: true },
  });

  res.json(note);
});

notesRouter.delete("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.note.delete({ where: { id } });
  res.status(204).send();
});
