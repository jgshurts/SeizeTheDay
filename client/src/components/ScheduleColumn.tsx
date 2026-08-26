import { useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { fromDateKey } from "../lib/date";
import type { CalendarEvent } from "../types";

interface ScheduleColumnProps {
  activeDate: string;
}

const START_HOUR = 7; // 7 AM
const END_HOUR = 20; // 8 PM -- the grid's bottom edge
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const MIN_EVENT_HEIGHT = 18; // px -- floor so short events stay legible

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatHourLabel(hour: number): string {
  const suffix = hour < 12 || hour === 24 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${suffix}`;
}

interface PositionedEvent {
  event: CalendarEvent;
  topPct: number;
  heightPct: number;
  left: number;
  width: number;
}

// Packs same-day timed events into a 7 AM-8 PM grid, side-by-side when they
// overlap in time (like a day-view calendar) rather than stacking illegibly.
// Position/size are percentages of the grid's own height, so the whole
// 7 AM-8 PM span fills the column's actual available height via plain CSS,
// growing or shrinking with the viewport with no JS measurement involved.
function layoutTimedEvents(events: CalendarEvent[]): PositionedEvent[] {
  const windowStart = START_HOUR * 60;
  const windowEnd = END_HOUR * 60;

  const spans = events
    .map((event) => {
      const start = clamp(minutesSinceMidnight(event.start), windowStart, windowEnd);
      const rawEnd = Math.max(minutesSinceMidnight(event.end), start + 15);
      const end = clamp(rawEnd, windowStart, windowEnd);
      return { event, start, end: Math.max(end, start) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const positioned: PositionedEvent[] = [];

  let cluster: typeof spans = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;

    const columnEnds: number[] = [];
    const columnByIndex: number[] = [];
    cluster.forEach((span, i) => {
      let col = columnEnds.findIndex((end) => end <= span.start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(span.end);
      } else {
        columnEnds[col] = span.end;
      }
      columnByIndex[i] = col;
    });

    const columnCount = columnEnds.length;
    cluster.forEach((span, i) => {
      positioned.push({
        event: span.event,
        topPct: ((span.start - windowStart) / TOTAL_MINUTES) * 100,
        heightPct: ((span.end - span.start) / TOTAL_MINUTES) * 100,
        left: (columnByIndex[i] / columnCount) * 100,
        width: 100 / columnCount,
      });
    });

    cluster = [];
    clusterEnd = -Infinity;
  }

  for (const span of spans) {
    if (cluster.length > 0 && span.start >= clusterEnd) {
      flushCluster();
    }
    cluster.push(span);
    clusterEnd = Math.max(clusterEnd, span.end);
  }
  flushCluster();

  return positioned;
}

// Deep-links into calendar.google.com's own "create event on this day" UI
// -- no API scope needed, it just opens the user's own logged-in session.
function googleCalendarDayUrl(dateKey: string): string {
  const d = fromDateKey(dateKey);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `https://calendar.google.com/calendar/r/day/${y}/${m}/${day}`;
}

export function ScheduleColumn({ activeDate }: ScheduleColumnProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<CalendarEvent[]>(`/calendar/events?date=${activeDate}`)
      .then(setEvents)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load calendar");
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [activeDate]);

  const allDayEvents = useMemo(() => events.filter((e) => e.allDay), [events]);
  const positionedEvents = useMemo(
    () => layoutTimedEvents(events.filter((e) => !e.allDay)),
    [events],
  );

  const hourLabels = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hourLabels.push(h);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Schedule</h2>
        <a
          href={googleCalendarDayUrl(activeDate)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700"
        >
          <CalendarPlus size={16} /> Add
        </a>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && <p className="text-sm text-slate-400">Loading...</p>}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {allDayEvents.length > 0 && (
              <div className="mb-2 shrink-0 space-y-1">
                {allDayEvents.map((event) => (
                  <a
                    key={event.id}
                    href={event.htmlLink ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-sky-100"
                  >
                    {event.title}
                  </a>
                ))}
              </div>
            )}

            <div className="relative flex min-h-0 flex-1">
              <div className="relative w-9 shrink-0 text-right text-[10px] text-slate-400">
                {hourLabels.map((h) => (
                  <div
                    key={h}
                    className="absolute right-1 -translate-y-1/2"
                    style={{ top: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
                  >
                    {formatHourLabel(h)}
                  </div>
                ))}
              </div>

              <div className="relative min-w-0 flex-1 border-l border-slate-200">
                {hourLabels.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-slate-100"
                    style={{ top: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
                  />
                ))}

                {positionedEvents.length === 0 && (
                  <p className="absolute inset-x-1 top-1 text-xs text-slate-400">
                    Nothing scheduled.
                  </p>
                )}

                {positionedEvents.map(({ event, topPct, heightPct, left, width }) => (
                  <a
                    key={event.id}
                    href={event.htmlLink ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute overflow-hidden rounded border border-sky-200 bg-sky-50 px-1 text-[11px] leading-tight hover:bg-sky-100"
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                      minHeight: MIN_EVENT_HEIGHT,
                      left: `calc(${left}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                    }}
                    title={`${event.title} (${formatTime(event.start)} - ${formatTime(event.end)})`}
                  >
                    <div className="font-medium text-slate-800">{event.title}</div>
                    <div className="text-slate-500">{formatTime(event.start)}</div>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
