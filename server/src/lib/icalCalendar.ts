import dns from "dns/promises";
import net from "net";
import ical from "node-ical";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string | null;
  // Always null here -- an iCal feed has no concept of our Projects. The
  // route fills this in from EventProjectTag after fetching.
  projectId: string | null;
}

// The feed address couldn't be used -- something the user can fix in
// Settings > Calendar, so the route reports it as such, not as a 500.
export class CalendarFeedError extends Error {}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_FEED_BYTES = 10 * 1024 * 1024;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;
// A manual refresh may skip the cache, but not for a copy fetched this
// recently -- repeated clicks shouldn't turn into repeated hits on Google.
const MIN_FORCED_REFETCH_MS = 30 * 1000;

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

// The server fetches whatever address a user pastes, so this refuses
// anything that could reach the machine's own network: HTTPS only, and the
// host must not resolve to a private or loopback address.
export async function normalizeFeedUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^webcal:\/\//i, "https://"));
  } catch {
    throw new CalendarFeedError("That doesn't look like a web address");
  }
  if (url.protocol !== "https:") {
    throw new CalendarFeedError("The calendar address must start with https:// or webcal://");
  }
  if (url.username || url.password) {
    throw new CalendarFeedError("The calendar address can't contain a username or password");
  }

  let addresses: { address: string }[];
  try {
    addresses = net.isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new CalendarFeedError("Couldn't find that calendar address's server");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new CalendarFeedError("That calendar address isn't allowed");
  }
  return url.toString();
}

const cache = new Map<string, { at: number; text: string }>();

async function fetchFeed(url: string, force = false): Promise<string> {
  const hit = cache.get(url);
  const maxAge = force ? MIN_FORCED_REFETCH_MS : CACHE_TTL_MS;
  if (hit && Date.now() - hit.at < maxAge) return hit.text;

  let res: Response;
  try {
    // redirect: "error" so a feed can't bounce us to an internal address
    // after the check in normalizeFeedUrl.
    res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new CalendarFeedError("Couldn't reach your calendar. Check the address in Settings > Calendar.");
  }
  if (!res.ok) {
    throw new CalendarFeedError(
      "Your calendar address was rejected. Copy the private iCal address again in Settings > Calendar.",
    );
  }

  const text = await res.text();
  if (text.length > MAX_FEED_BYTES) {
    throw new CalendarFeedError("That calendar is too large to load");
  }
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new CalendarFeedError("That address isn't an iCal calendar feed");
  }

  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(url, { at: Date.now(), text });
  return text;
}

// Drops the cached copy so a freshly saved address is read straight away.
export function forgetFeed(url: string): void {
  cache.delete(url);
}

// Checks an address end to end before it's saved.
export async function checkFeed(rawUrl: string): Promise<string> {
  const url = await normalizeFeedUrl(rawUrl);
  forgetFeed(url);
  ical.sync.parseICS(await fetchFeed(url));
  return url;
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) return String((value as { val: unknown }).val);
  return "";
}

const pad = (n: number) => String(n).padStart(2, "0");

// All-day values are floating dates; read them back in the same (server
// local) time the day window below is built in.
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

// Ids follow Google's own scheme (uid without "@google.com", plus the
// instance's start for repeating events), so project tags made while the
// calendar came from the Google API keep matching their events.
function eventId(uid: string, isRecurring: boolean, start: Date, allDay: boolean): string {
  const base = uid.replace(/@google\.com$/, "");
  if (!isRecurring) return base;
  return `${base}_${allDay ? localDate(start).replace(/-/g, "") : utcStamp(start)}`;
}

export async function getEventsForDate(
  feedUrl: string,
  dateKey: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<CalendarEvent[]> {
  const parsed = ical.sync.parseICS(await fetchFeed(feedUrl, fresh));

  const dayStart = new Date(`${dateKey}T00:00:00`);
  const dayEnd = new Date(`${dateKey}T23:59:59.999`);

  const events: (CalendarEvent & { sortKey: number })[] = [];
  for (const component of Object.values(parsed)) {
    if (!component || component.type !== "VEVENT" || component.status === "CANCELLED") continue;

    for (const instance of ical.expandRecurringEvent(component, {
      from: dayStart,
      to: dayEnd,
      expandOngoing: true,
    })) {
      const start = instance.start;
      const end = instance.end ?? instance.start;
      const allDay = instance.isFullDay;
      // The expansion also returns events that merely touch the window (one
      // ending exactly at midnight); a day view only wants real overlap.
      if (start > dayEnd || (end <= dayStart && end > start)) continue;

      events.push({
        id: eventId(instance.event.uid, instance.isRecurring, start, allDay),
        title: text(instance.summary) || "(no title)",
        start: allDay ? localDate(start) : start.toISOString(),
        end: allDay ? localDate(end) : end.toISOString(),
        allDay,
        htmlLink: null,
        projectId: null,
        sortKey: start.getTime(),
      });
    }
  }

  return events.sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey: _sortKey, ...event }) => event);
}
