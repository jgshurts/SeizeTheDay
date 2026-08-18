import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-me";

export interface AuthTokenPayload {
  userId: string;
  nickname: string;
}

// No expiry: per the spec, a session stays open as long as the app window
// is open. The client drops the token (sessionStorage) when the tab closes.
export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
