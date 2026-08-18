import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { nickname, password } = req.body as { nickname?: string; password?: string };

  if (!nickname || !password) {
    return res.status(400).json({ error: "Nickname and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) {
    return res.status(401).json({ error: "Invalid nickname or password" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid nickname or password" });
  }

  const token = signToken({ userId: user.id.toString(), nickname: user.nickname });
  res.json({
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
    },
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: BigInt(req.user!.userId) } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
  });
});
