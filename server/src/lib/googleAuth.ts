import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:4000/api/auth/google/callback";

// Calendar scope doubles up login (openid/email/profile) and read access to
// the user's calendar for the Schedule column, so one consent grant covers
// both -- there's no separate "connect calendar" step.
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getGoogleAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    // Forces Google to reissue a refresh token on every login, since we
    // don't persist access tokens/expiry -- each calendar read exchanges
    // the refresh token fresh. Without this, Google only grants a refresh
    // token on a user's very first consent.
    prompt: "consent",
    scope: SCOPES,
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export async function exchangeCodeForProfile(
  code: string,
): Promise<{ profile: GoogleProfile; refreshToken: string | null }> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google did not return an ID token");
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google ID token is missing required fields");
  }

  return {
    profile: {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name ?? payload.email.split("@")[0],
      lastName: payload.family_name ?? "",
      avatarUrl: payload.picture ?? null,
    },
    refreshToken: tokens.refresh_token ?? null,
  };
}
