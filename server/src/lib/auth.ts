import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-me";

export interface AuthTokenPayload {
  userId: string;
  nickname: string;
  // Added by jsonwebtoken when signing (seconds since the epoch).
  iat?: number;
}

// A session lasts SESSION_DAYS from the last time it was renewed: the client
// keeps the token across app restarts (a phone home-screen app is killed
// often), and requireAuth hands out a fresh one once the current token is
// REFRESH_AFTER_HOURS old, so only a few idle days ask for a password again.
export const SESSION_DAYS = 3;
export const REFRESH_AFTER_HOURS = 12;

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
