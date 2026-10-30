import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { handlePrismaError } from "../lib/prismaErrors";
import { userDirectorySelect, userListSelect, userSelect } from "../lib/userSelect";
import { currentUserId, requireAdmin } from "../lib/access";
import { hashPassword, newInvite, passwordProblem, verifyPassword } from "../lib/password";

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
    if (!me?.isAdmin) {
      res.json(
        await prisma.user.findMany({ select: userDirectorySelect, orderBy: { nickname: "asc" } }),
      );
      return;
    }

    // Admins also see who can sign in yet and who has an invite outstanding;
    // the hash itself never leaves the server.
    const users = await prisma.user.findMany({
      select: { ...userListSelect, passwordHash: true, inviteExpiresAt: true },
      orderBy: { nickname: "asc" },
    });
    res.json(
      users.map(({ passwordHash, inviteExpiresAt, ...user }) => ({
        ...user,
        hasPassword: passwordHash !== null,
        invitePending: inviteExpiresAt !== null && inviteExpiresAt > new Date(),
      })),
    );
  }),
);

// Creates the account without a password. The person can't sign in until an
// admin issues them an invite link (POST /:id/invite) and they choose one.
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

// Issues a one-time link (valid for a week) that lets the person choose a
// password -- for a new user's first sign-in, or to reset a forgotten one.
// Replaces any earlier outstanding link. The raw token is only ever returned
// here; the database keeps its hash.
usersRouter.post(
  "/:id/invite",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { token, tokenHash, expiresAt } = newInvite();
    try {
      await prisma.user.update({
        where: { id: BigInt(req.params.id) },
        data: { inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt },
      });
      res.json({ token, expiresAt });
    } catch (err) {
      handlePrismaError(err, res);
    }
  }),
);

// Self-service: needs the current password so a borrowed, still-open session
// can't be used to lock the owner out.
usersRouter.patch(
  "/me/password",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body as Record<string, unknown>;
    const problem = passwordProblem(newPassword);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: currentUserId(req) } });
    if (
      !user ||
      typeof currentPassword !== "string" ||
      !(await verifyPassword(currentPassword, user.passwordHash))
    ) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword as string) },
    });
    res.status(204).send();
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
