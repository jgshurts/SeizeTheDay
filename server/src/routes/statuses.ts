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
    const statuses = await prisma.status.findMany({ orderBy: { ordinal: "asc" } });
    res.json(statuses);
  }),
);

statusesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { statusCode, isComplete, backgroundColor, foregroundColor, description, ordinal, isDefault } =
      req.body as Record<string, unknown>;

    if (typeof statusCode !== "string" || !statusCode || typeof ordinal !== "number") {
      res.status(400).json({ error: "statusCode and ordinal (number) are required" });
      return;
    }

    try {
      // Only one status can be the default for new tasks -- clear it from
      // every other row first when this one claims it.
      const status = await prisma.$transaction(async (tx) => {
        if (isDefault) {
          await tx.status.updateMany({ data: { isDefault: false } });
        }
        return tx.status.create({
          data: {
            statusCode,
            isComplete: Boolean(isComplete),
            backgroundColor: (backgroundColor as string | undefined) ?? null,
            foregroundColor: (foregroundColor as string | undefined) ?? null,
            description: (description as string | undefined) ?? null,
            ordinal,
            isDefault: Boolean(isDefault),
          },
        });
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
    const { statusCode, isComplete, backgroundColor, foregroundColor, description, ordinal, isDefault } =
      req.body as Record<string, unknown>;

    try {
      const status = await prisma.$transaction(async (tx) => {
        if (isDefault) {
          await tx.status.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
        }
        return tx.status.update({
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
            ...(ordinal !== undefined ? { ordinal: ordinal as number } : {}),
            ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
          },
        });
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
