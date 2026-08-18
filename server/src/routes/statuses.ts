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
    const statuses = await prisma.status.findMany({ orderBy: { statusCode: "asc" } });
    res.json(statuses);
  }),
);

statusesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { statusCode, isComplete, backgroundColor, foregroundColor, description } =
      req.body as Record<string, unknown>;

    if (typeof statusCode !== "string" || !statusCode) {
      res.status(400).json({ error: "statusCode is required" });
      return;
    }

    try {
      const status = await prisma.status.create({
        data: {
          statusCode,
          isComplete: Boolean(isComplete),
          backgroundColor: (backgroundColor as string | undefined) ?? null,
          foregroundColor: (foregroundColor as string | undefined) ?? null,
          description: (description as string | undefined) ?? null,
        },
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
    const { statusCode, isComplete, backgroundColor, foregroundColor, description } =
      req.body as Record<string, unknown>;

    try {
      const status = await prisma.status.update({
        where: { id },
        data: {
          ...(statusCode !== undefined ? { statusCode: statusCode as string } : {}),
          ...(isComplete !== undefined ? { isComplete: Boolean(isComplete) } : {}),
          ...(backgroundColor !== undefined
            ? { backgroundColor: backgroundColor as string | null }
            : {}),
          ...(foregroundColor !== undefined
            ? { foregroundColor: foregroundColor as string | null }
            : {}),
          ...(description !== undefined ? { description: description as string | null } : {}),
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
