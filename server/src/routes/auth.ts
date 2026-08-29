import { Router } from "express";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler } from "../lib/asyncHandler";
import { exchangeCodeForProfile, getGoogleAuthUrl } from "../lib/googleAuth";
import { userSelect } from "../lib/userSelect";

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5174";

export const authRouter = Router();

// Full-page redirect, not a fetch call -- there's no session yet to attach
// a bearer token to, so the browser navigates here directly.
authRouter.get("/google/start", (_req, res) => {
  res.redirect(getGoogleAuthUrl());
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code;
    if (typeof code !== "string") {
      res.redirect(`${CLIENT_URL}/?authError=missing_code`);
      return;
    }

    const { profile, refreshToken } = await exchangeCodeForProfile(code);

    // Link by googleId first, then fall back to a pre-provisioned row
    // created by email in Settings > Users, else create a brand-new user.
    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: profile.email } });
    }

    const data = {
      googleId: profile.googleId,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      ...(refreshToken ? { googleRefreshToken: refreshToken } : {}),
    };

    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data });
    } else {
      user = await prisma.user.create({
        data: {
          ...data,
          firstName: profile.firstName,
          lastName: profile.lastName,
          nickname: profile.email.split("@")[0],
        },
      });
    }

    const token = signToken({ userId: user.id.toString(), nickname: user.nickname });
    res.redirect(`${CLIENT_URL}/?token=${encodeURIComponent(token)}`);
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
