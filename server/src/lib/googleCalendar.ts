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

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

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
