import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { parseDateParam } from "../lib/date";
import { generateUniqueShortRef } from "../lib/noteRefs";

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
  const { projectId } = req.query;

  const notes = await prisma.note.findMany({
    where: {
      contextDate,
      ...(typeof projectId === "string" && projectId ? { projectId: BigInt(projectId) } : {}),
    },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(notes);
});

// Resolves an "@REF" reference (see client's noteRefs.ts) to a note.
// short_ref has no database-level uniqueness constraint -- older rows from
// before refs were auto-generated may still collide -- so this resolves to
// whichever matching note was created most recently, same as before.
notesRouter.get("/by-ref/:shortRef", async (req, res) => {
  const note = await prisma.note.findFirst({
    where: { shortRef: { equals: req.params.shortRef, mode: "insensitive" } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });
  if (!note) {
    return res.status(404).json({ error: "No note found for that reference" });
  }
  res.json(note);
});

notesRouter.post("/", async (req, res) => {
  const { projectId, noteText, contextDate } = req.body as Record<string, unknown>;

  const parsedContextDate = parseDateParam(contextDate);
  if (!parsedContextDate) {
    return res.status(400).json({ error: "contextDate (YYYY-MM-DD) is required" });
  }

  const note = await prisma.note.create({
    data: {
      projectId: projectId ? BigInt(projectId as string) : null,
      shortRef: await generateUniqueShortRef(),
      noteText: (noteText as string | undefined) ?? null,
      contextDate: parsedContextDate,
    },
    include: { project: true },
  });

  res.status(201).json(note);
});

// created_at and short_ref are both immutable by design -- the ref is
// generated once at creation so links to it never go stale; only project
// and noteText can change.
notesRouter.patch("/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const { projectId, noteText } = req.body as Record<string, unknown>;

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(projectId !== undefined ? { projectId: projectId ? BigInt(projectId as string) : null } : {}),
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
