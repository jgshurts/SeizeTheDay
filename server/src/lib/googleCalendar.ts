import { google } from "googleapis";
import { createOAuthClient } from "./googleAuth";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string | null;
  // Always null here -- Google has no concept of our Projects. The route
  // fills this in from EventProjectTag after fetching.
  projectId: string | null;
}

// Google refused to read this user's calendar with the access we hold --
// something the user can fix by signing in again, so the route reports it
// as such rather than as a server error.
export class CalendarAccessError extends Error {}

// Google's consent screen lets a user untick calendar access while still
// signing in, which leaves a refresh token that can't read calendars (403,
// insufficient scopes). A revoked or expired refresh token (e.g. the 7-day
// limit while the Google app is in Testing) fails the token exchange with
// invalid_grant instead.
function toCalendarAccessError(err: unknown): CalendarAccessError | null {
  const e = err as { response?: { status?: number; data?: { error?: unknown } } };
  const status = e.response?.status;
  if (e.response?.data?.error === "invalid_grant" || status === 401) {
    return new CalendarAccessError(
      "Google calendar access has expired or been revoked. Sign out and sign in again.",
    );
  }
  if (status === 403) {
    return new CalendarAccessError(
      "Calendar access wasn't granted. Sign out, sign in again, and tick \"See your calendars\" on Google's consent screen.",
    );
  }
  return null;
}

// No access token is persisted -- each read hands the stored refresh token
// to a fresh OAuth2Client, which exchanges it for a short-lived access token
// on demand. Simpler than tracking expiry ourselves for a column that's
// read a handful of times a day.
export async function getEventsForDate(
  refreshToken: string,
  dateKey: string,
): Promise<CalendarEvent[]> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: client });

  const timeMin = new Date(`${dateKey}T00:00:00`);
  const timeMax = new Date(`${dateKey}T23:59:59.999`);

  let data;
  try {
    ({ data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    }));
  } catch (err) {
    throw toCalendarAccessError(err) ?? err;
  }

  return (data.items ?? []).map((event) => {
    const allDay = Boolean(event.start?.date);
    return {
      id: event.id ?? "",
      title: event.summary ?? "(no title)",
      start: (event.start?.dateTime ?? event.start?.date ?? "") as string,
      end: (event.end?.dateTime ?? event.end?.date ?? "") as string,
      allDay,
      htmlLink: event.htmlLink ?? null,
      projectId: null,
    };
  });
}
