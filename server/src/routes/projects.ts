import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";
import { currentUserId } from "../lib/access";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

// Projects are per-user: every route here only ever sees the signed-in
// user's own. Another user's project id is treated as not found.
async function findOwnProject(req: AuthedRequest) {
  return prisma.project.findFirst({
    where: { id: BigInt(req.params.id), ownerId: currentUserId(req) },
    select: { id: true },
  });
}

projectsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const projects = await prisma.project.findMany({
      where: { ownerId: currentUserId(req) },
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true, notes: true } } },
    });
    res.json(projects);
  }),
);

projectsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name, description, color } = req.body as Record<string, unknown>;

    if (typeof name !== "string" || !name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    try {
      const project = await prisma.project.create({
        data: {
          ownerId: currentUserId(req),
          name,
          description: (description as string | undefined) ?? null,
          color: (color as string | undefined) ?? null,
        },
      });
      res.status(201).json(project);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

projectsRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = BigInt(req.params.id);
    const { name, description, color } = req.body as Record<string, unknown>;
    if (!(await findOwnProject(req))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    try {
      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name: name as string } : {}),
          ...(description !== undefined ? { description: description as string | null } : {}),
          ...(color !== undefined ? { color: color as string | null } : {}),
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
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = BigInt(req.params.id);
    if (!(await findOwnProject(req))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    try {
      await prisma.project.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);
