import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
    res.json(projects);
  }),
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description } = req.body as Record<string, unknown>;

    if (typeof name !== "string" || !name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    try {
      const project = await prisma.project.create({
        data: { name, description: (description as string | undefined) ?? null },
      });
      res.status(201).json(project);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

projectsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    const { name, description } = req.body as Record<string, unknown>;

    try {
      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: name as string } : {}),
          ...(description !== undefined ? { description: description as string | null } : {}),
        },
      });
      res.json(project);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

projectsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    try {
      await prisma.project.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);
