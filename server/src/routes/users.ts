import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";
import { userDirectorySelect, userListSelect, userSelect } from "../lib/userSelect";
import { currentUserId, requireAdmin } from "../lib/access";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Everyone can list users (to pick someone to delegate a task to); only
// admins, who manage the list in Settings > Users, get the full details.
usersRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const me = await prisma.user.findUnique({
      where: { id: currentUserId(req) },
      select: { isAdmin: true },
    });
    const users = await prisma.user.findMany({
      select: me?.isAdmin ? userListSelect : userDirectorySelect,
      orderBy: { nickname: "asc" },
    });
    res.json(users);
  }),
);

// Creates a placeholder row by email -- once that person signs in with
// Google, the callback links their googleId to this row instead of making
// a duplicate. This is also the invitation: the callback turns away any
// Google account that hasn't been added here first.
usersRouter.post(
  "/",
  requireAdmin,
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
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = BigInt(req.params.id);
    const { firstName, lastName, nickname, email, isAdmin } = req.body as Record<string, unknown>;

    // Keeps an admin from locking everyone (including themselves) out of
    // Settings by removing their own admin access.
    if (isAdmin === false && id === currentUserId(req)) {
      res.status(400).json({ error: "You cannot remove your own admin access" });
      return;
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName !== undefined ? { firstName: firstName as string } : {}),
          ...(lastName !== undefined ? { lastName: lastName as string } : {}),
          ...(nickname !== undefined ? { nickname: nickname as string } : {}),
          ...(email !== undefined ? { email: email as string } : {}),
          ...(typeof isAdmin === "boolean" ? { isAdmin } : {}),
        },
        select: userSelect,
      });
      res.json(user);
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

// Self-service theme update -- distinct from the admin PATCH /:id above,
// which any authenticated user could otherwise point at any id.
usersRouter.patch(
  "/me/theme",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { bannerColor, subBannerColor, backgroundColor, leftImage, rightImage } = req.body as Record<
      string,
      unknown
    >;

    const user = await prisma.user.update({
      where: { id: BigInt(req.user!.userId) },
      data: {
        ...(bannerColor !== undefined ? { themeBannerColor: bannerColor as string | null } : {}),
        ...(subBannerColor !== undefined
          ? { themeSubBannerColor: subBannerColor as string | null }
          : {}),
        ...(backgroundColor !== undefined
          ? { themeBackgroundColor: backgroundColor as string | null }
          : {}),
        ...(leftImage !== undefined ? { themeLeftImage: leftImage as string | null } : {}),
        ...(rightImage !== undefined ? { themeRightImage: rightImage as string | null } : {}),
      },
      select: userSelect,
    });
    res.json(user);
  }),
);

usersRouter.delete(
  "/:id",
  requireAdmin,
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
