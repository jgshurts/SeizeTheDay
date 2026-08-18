import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";

export const priorityGroupsRouter = Router();
priorityGroupsRouter.use(requireAuth);

priorityGroupsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const priorityGroups = await prisma.priorityGroup.findMany({ orderBy: { prty: "asc" } });
    res.json(priorityGroups);
  }),
);

priorityGroupsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { prty, prtyCode, description } = req.body as Record<string, unknown>;

    if (typeof prty !== "number" || typeof prtyCode !== "string" || !prtyCode) {
      res.status(400).json({ error: "prty (number) and prtyCode are required" });
      return;
    }

    try {
      const priorityGroup = await prisma.priorityGroup.create({
        data: { prty, prtyCode, description: (description as string | undefined) ?? null },
      });
      res.status(201).json(priorityGroup);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

priorityGroupsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    const { prty, prtyCode, description } = req.body as Record<string, unknown>;

    try {
      const priorityGroup = await prisma.priorityGroup.update({
        where: { id },
        data: {
          ...(prty !== undefined ? { prty: prty as number } : {}),
          ...(prtyCode !== undefined ? { prtyCode: prtyCode as string } : {}),
          ...(description !== undefined ? { description: description as string | null } : {}),
        },
      });
      res.json(priorityGroup);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

priorityGroupsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    try {
      await prisma.priorityGroup.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);
