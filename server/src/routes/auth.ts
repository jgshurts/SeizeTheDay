import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { userSelect } from "../lib/userSelect";
import { hashInviteToken, hashPassword, passwordProblem, verifyPassword } from "../lib/password";

export const authRouter = Router();

// Throttles guessing: this guards the only unauthenticated endpoints that
// take a secret. Skipped under test, where many logins run back to back.
const attemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Too many attempts. Try again in a few minutes." },
});

const BAD_LOGIN = "Incorrect nickname/email or password";

function sessionFor(user: { id: bigint; nickname: string }) {
  return signToken({ userId: user.id.toString(), nickname: user.nickname });
}

authRouter.post(
  "/login",
  attemptLimiter,
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body as Record<string, unknown>;
    if (typeof identifier !== "string" || typeof password !== "string" || !identifier || !password) {
      res.status(400).json({ error: "Nickname or email, and password, are required" });
      return;
    }

    // Nickname or email, ignoring case. If that somehow matches more than
    // one account, refuse rather than guess which one was meant.
    const matches = await prisma.user.findMany({
      where: {
        OR: [
          { email: { equals: identifier.trim(), mode: "insensitive" } },
          { nickname: { equals: identifier.trim(), mode: "insensitive" } },
        ],
      },
      take: 2,
    });
    const user = matches.length === 1 ? matches[0] : null;

    const ok = await verifyPassword(password, user?.passwordHash ?? null);
    if (!user || !ok) {
      res.status(401).json({ error: BAD_LOGIN });
      return;
    }

    res.json({ token: sessionFor(user) });
  }),
);

// Shared by new-user invites and admin-issued password resets: the link
// identifies the person, and opening it lets them choose a password.
async function findInvitee(token: string) {
  return prisma.user.findFirst({
    where: { inviteTokenHash: hashInviteToken(token), inviteExpiresAt: { gt: new Date() } },
    select: { id: true, firstName: true, nickname: true },
  });
}

authRouter.get(
  "/invite/:token",
  attemptLimiter,
  asyncHandler(async (req, res) => {
    const invitee = await findInvitee(req.params.token);
    if (!invitee) {
      res.status(404).json({ error: "This invite link is invalid or has expired" });
      return;
    }
    res.json({ firstName: invitee.firstName, nickname: invitee.nickname });
  }),
);

authRouter.post(
  "/invite/:token",
  attemptLimiter,
  asyncHandler(async (req, res) => {
    const problem = passwordProblem((req.body as Record<string, unknown>).password);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }

    const invitee = await findInvitee(req.params.token);
    if (!invitee) {
      res.status(404).json({ error: "This invite link is invalid or has expired" });
      return;
    }

    // The where clause repeats the token check so a link can only be spent
    // once, even if two requests race.
    const passwordHash = await hashPassword((req.body as { password: string }).password);
    const { count } = await prisma.user.updateMany({
      where: { id: invitee.id, inviteTokenHash: hashInviteToken(req.params.token) },
      data: { passwordHash, inviteTokenHash: null, inviteExpiresAt: null },
    });
    if (count !== 1) {
      res.status(404).json({ error: "This invite link is invalid or has expired" });
      return;
    }

    res.json({ token: sessionFor(invitee) });
  }),
);

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.user!.userId) },
    select: userSelect,
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});
