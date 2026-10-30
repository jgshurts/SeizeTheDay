import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

// bcrypt silently ignores everything past 72 bytes, so cap it rather than
// let two different long passwords hash the same.
export const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_BYTES = 72;

// Returns a user-facing reason the password is unacceptable, or null.
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} bytes`;
  }
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Compared against when the account doesn't exist (or has no password yet),
// so a login attempt takes about as long either way and doesn't reveal
// which nicknames and emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return hash !== null && ok;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// The raw token goes into the link the admin shares; only its hash is saved.
export function newInvite(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) };
}
