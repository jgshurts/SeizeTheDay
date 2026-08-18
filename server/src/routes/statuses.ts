import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";

export const statusesRouter = Router();
statusesRouter.use(requireAuth);

statusesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const statuses = await prisma.status.findMany({ orderBy: { prty: "asc" } });
    res.json(statuses);
  }),
);

statusesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { prty, statusCode, isComplete } = req.body as Record<string, unknown>;

    if (typeof prty !== "number" || typeof statusCode !== "string" || !statusCode) {
      res.status(400).json({ error: "prty (number) and statusCode are required" });
      return;
    }

    try {
      const status = await prisma.status.create({
        data: { prty, statusCode, isComplete: Boolean(isComplete) },
      });
      res.status(201).json(status);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

statusesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    const { prty, statusCode, isComplete } = req.body as Record<string, unknown>;

    try {
      const status = await prisma.status.update({
        where: { id },
        data: {
          ...(prty !== undefined ? { prty: prty as number } : {}),
          ...(statusCode !== undefined ? { statusCode: statusCode as string } : {}),
          ...(isComplete !== undefined ? { isComplete: Boolean(isComplete) } : {}),
        },
      });
      res.json(status);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

statusesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    try {
      await prisma.status.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);
