import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  nickname: true,
  email: true,
  avatarUrl: true,
} as const;

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { nickname: "asc" } });
    res.json(users);
  }),
);

// Creates a placeholder row by email -- once that person signs in with
// Google, the callback links their googleId to this row instead of making
// a duplicate.
usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { firstName, lastName, nickname, email } = req.body as Record<string, unknown>;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof nickname !== "string" ||
      typeof email !== "string" ||
      !firstName ||
      !lastName ||
      !nickname ||
      !email
    ) {
      res.status(400).json({ error: "firstName, lastName, nickname, and email are required" });
      return;
    }

    try {
      const user = await prisma.user.create({
        data: { firstName, lastName, nickname, email },
        select: userSelect,
      });
      res.status(201).json(user);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    const { firstName, lastName, nickname, email } = req.body as Record<string, unknown>;

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName !== undefined ? { firstName: firstName as string } : {}),
          ...(lastName !== undefined ? { lastName: lastName as string } : {}),
          ...(nickname !== undefined ? { nickname: nickname as string } : {}),
          ...(email !== undefined ? { email: email as string } : {}),
        },
        select: userSelect,
      });
      res.json(user);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.params.id === req.user!.userId) {
      res.status(400).json({ error: "You cannot delete your own account while logged in" });
      return;
    }

    const id = BigInt(req.params.id);
    try {
      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);
