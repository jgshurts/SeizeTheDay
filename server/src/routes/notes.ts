import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

export const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.get("/", async (_req, res) => {
  const notes = await prisma.note.findMany({
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(notes);
});

notesRouter.post("/", async (req, res) => {
  const { projectId, shortRef, noteText } = req.body as Record<string, unknown>;

  const note = await prisma.note.create({
    data: {
      projectId: projectId ? BigInt(projectId as string) : null,
      shortRef: (shortRef as string | undefined)?.slice(0, 10) ?? null,
      noteText: (noteText as string | undefined) ?? null,
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
