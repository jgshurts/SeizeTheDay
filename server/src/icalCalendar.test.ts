import { CalendarFeedError, getEventsForDate, normalizeFeedUrl } from "./lib/icalCalendar";

const FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//test//EN",
  // One-off timed event.
  "BEGIN:VEVENT",
  "UID:once@google.com",
  "DTSTART:20261013T150000Z",
  "DTEND:20261013T160000Z",
  "SUMMARY:Dentist",
  "END:VEVENT",
  // Weekly on Tuesdays; 2026-10-13 is a Tuesday.
  "BEGIN:VEVENT",
  "UID:weekly@google.com",
  "DTSTART:20261006T170000Z",
  "DTEND:20261006T173000Z",
  "RRULE:FREQ=WEEKLY;BYDAY=TU",
  "SUMMARY:Standup",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:allday@google.com",
  "DTSTART;VALUE=DATE:20261013",
  "DTEND;VALUE=DATE:20261014",
  "SUMMARY:Holiday",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:cancelled@google.com",
  "DTSTART:20261013T180000Z",
  "DTEND:20261013T190000Z",
  "STATUS:CANCELLED",
  "SUMMARY:Called off",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:otherday@google.com",
  "DTSTART:20261020T150000Z",
  "DTEND:20261020T160000Z",
  "SUMMARY:Next week",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("getEventsForDate", () => {
  beforeEach(() => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(FEED, { status: 200 }));
  });
  afterEach(() => jest.restoreAllMocks());

  it("returns the day's events, including repeats and all-day ones, and skips cancelled and other days", async () => {
    // Distinct URL per test: feeds are cached by address.
    const events = await getEventsForDate("https://example.com/a.ics", "2026-10-13");
    expect(events.map((e) => e.title).sort()).toEqual(["Dentist", "Holiday", "Standup"]);

    const holiday = events.find((e) => e.title === "Holiday")!;
    expect(holiday).toMatchObject({ allDay: true, start: "2026-10-13", end: "2026-10-14" });

    const dentist = events.find((e) => e.title === "Dentist")!;
    expect(dentist.allDay).toBe(false);
    expect(dentist.start).toBe("2026-10-13T15:00:00.000Z");
  });

  it("gives repeating events Google-style per-instance ids and one-offs the bare id", async () => {
    const events = await getEventsForDate("https://example.com/b.ics", "2026-10-13");
    expect(events.find((e) => e.title === "Dentist")!.id).toBe("once");
    expect(events.find((e) => e.title === "Standup")!.id).toBe("weekly_20261013T170000Z");
  });

  it("explains a feed that isn't iCal", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response("<html>nope</html>", { status: 200 }));
    await expect(getEventsForDate("https://example.com/c.ics", "2026-10-13")).rejects.toBeInstanceOf(
      CalendarFeedError,
    );
  });

  it("explains a rejected address", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response("", { status: 404 }));
    await expect(getEventsForDate("https://example.com/d.ics", "2026-10-13")).rejects.toThrow(/rejected/);
  });
});

describe("normalizeFeedUrl", () => {
  it("accepts webcal:// as https", async () => {
    await expect(normalizeFeedUrl("webcal://1.1.1.1/cal.ics")).resolves.toBe("https://1.1.1.1/cal.ics");
  });

  it.each([
    ["plain http", "http://1.1.1.1/cal.ics"],
    ["not a URL", "not a url"],
    ["loopback", "https://127.0.0.1/cal.ics"],
    ["localhost", "https://localhost/cal.ics"],
    ["private range", "https://10.0.0.5/cal.ics"],
    ["cloud metadata address", "https://169.254.169.254/latest/meta-data"],
    ["IPv6 loopback", "https://[::1]/cal.ics"],
    ["embedded credentials", "https://user:pw@1.1.1.1/cal.ics"],
  ])("refuses %s", async (_label, url) => {
    await expect(normalizeFeedUrl(url)).rejects.toBeInstanceOf(CalendarFeedError);
  });
});

describe("getEventsForDate caching", () => {
  afterEach(() => jest.restoreAllMocks());

  it("serves repeat reads from cache, and a forced refresh still waits out the 30-second floor", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async () => new Response(FEED, { status: 200 }));
    const url = "https://example.com/cache.ics";

    await getEventsForDate(url, "2026-10-13");
    await getEventsForDate(url, "2026-10-13");
    await getEventsForDate(url, "2026-10-13", { fresh: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const now = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(now + 31_000);
    await getEventsForDate(url, "2026-10-13", { fresh: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await getEventsForDate(url, "2026-10-13");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
