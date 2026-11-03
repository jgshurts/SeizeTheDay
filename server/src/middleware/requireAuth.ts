import { NextFunction, Request, Response } from "express";
import { REFRESH_AFTER_HOURS, signToken, verifyToken } from "../lib/auth";

export interface AuthedRequest extends Request {
  user?: { userId: string; nickname: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { userId, nickname, iat } = verifyToken(token);
    req.user = { userId, nickname };
    // Sliding session: an aging token is swapped for a fresh one, which the
    // client stores in place of the old one.
    if (iat !== undefined && Date.now() / 1000 - iat > REFRESH_AFTER_HOURS * 3600) {
      res.setHeader("X-Refreshed-Token", signToken({ userId, nickname }));
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
