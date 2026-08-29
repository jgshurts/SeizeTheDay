import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { withAlpha } from "../lib/color";
import { googleCalendarDayUrl } from "../lib/googleCalendarLink";
import { toLocalDateKey } from "../lib/date";
import { playAlertTone } from "../lib/alertSound";
import { ColumnHeader, ADD_BUTTON_CLASS } from "./ColumnHeader";
import type { CalendarEvent, Project } from "../types";

const NOW_LINE_REFRESH_MS = 5 * 60 * 1000;
const UPCOMING_ALERT_MINUTES = 10;

interface ScheduleColumnProps {
  activeDate: string;
  projects: Project[];
  subBannerColor: string | null | undefined;
}

const START_HOUR = 7; // 7 AM
const END_HOUR = 20; // 8 PM -- the grid's bottom edge
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const MIN_EVENT_HEIGHT = 18; // px -- floor so short events stay legible
const UNTAGGED_DOT_COLOR = "#cbd5e1"; // slate-300

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

interface ProjectTagDotProps {
  event: CalendarEvent;
  projects: Project[];
  projectById: Map<string, Project>;
  onTag: (eventId: string, projectId: string | null) => void;
}

// A tiny colored swatch, doubling as a native <select>, that tags this event
// with a Project -- Google Calendar has no such relationship of its own.
function ProjectTagDot({ event, projects, projectById, onTag }: ProjectTagDotProps) {
  const color = event.projectId ? projectById.get(event.projectId)?.color : null;
  return (
    <select
      aria-label={`Tag "${event.title}" with a project`}
      value={event.projectId ?? ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onTag(event.id, e.target.value || null)}
      className="absolute right-0.5 top-0.5 h-2.5 w-2.5 cursor-pointer appearance-none rounded-full border border-white"
      style={{ backgroundColor: color ?? UNTAGGED_DOT_COLOR }}
    >
      <option value="">No project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function ScheduleColumn({ activeDate, projects, subBannerColor }: ScheduleColumnProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  // Refreshed on an interval rather than derived once, so the line actually
  // creeps down the grid while the app stays open on the day view.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), NOW_LINE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const windowStart = START_HOUR * 60;
  const windowEnd = END_HOUR * 60;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = toLocalDateKey(now) === activeDate;
  const showNowLine = isToday && nowMinutes >= windowStart && nowMinutes <= windowEnd;
  const nowLineTopPct = ((nowMinutes - windowStart) / TOTAL_MINUTES) * 100;

  // Timed events (not all-day) starting within the alert window, counting
  // down from "now" -- drives both the glow below and the chime effect
  // right after it. Only meaningful while looking at today's actual
  // schedule, same as the now-line.
  const upcomingEventIds = useMemo(() => {
    const ids = new Set<string>();
    if (!isToday) return ids;
    for (const event of events) {
      if (event.allDay) continue;
      const minutesUntil = minutesSinceMidnight(event.start) - nowMinutes;
      if (minutesUntil >= 0 && minutesUntil <= UPCOMING_ALERT_MINUTES) ids.add(event.id);
    }
    return ids;
  }, [events, isToday, nowMinutes]);

  // Chimes once per event as it crosses into the alert window -- tracked in
  // a ref (not state) purely as a "have we already alerted this one" set,
  // so it doesn't itself trigger a re-render.
  const alertedEventIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    alertedEventIdsRef.current = new Set();
  }, [activeDate]);
  useEffect(() => {
    for (const id of upcomingEventIds) {
      if (!alertedEventIdsRef.current.has(id)) {
        alertedEventIdsRef.current.add(id);
        playAlertTone();
      }
    }
  }, [upcomingEventIds]);

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

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  async function tagEvent(eventId: string, projectId: string | null) {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, projectId } : e)));
    try {
      await api.patch(`/calendar/events/${encodeURIComponent(eventId)}/project`, { projectId });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to tag event");
    }
  }

  const allDayEvents = useMemo(() => events.filter((e) => e.allDay), [events]);
  const positionedEvents = useMemo(
    () => layoutTimedEvents(events.filter((e) => !e.allDay)),
    [events],
  );

  const hourLabels = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hourLabels.push(h);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <ColumnHeader label="Schedule" color={subBannerColor}>
        <a
          href={googleCalendarDayUrl(activeDate)}
          target="_blank"
          rel="noreferrer"
          className={ADD_BUTTON_CLASS}
        >
          <CalendarPlus size={16} /> New Event
        </a>
      </ColumnHeader>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && <p className="text-sm text-slate-400">Loading...</p>}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {allDayEvents.length > 0 && (
              <div className="mb-2 shrink-0 space-y-1">
                {allDayEvents.map((event) => {
                  const project = event.projectId ? projectById.get(event.projectId) : null;
                  return (
                    <div
                      key={event.id}
                      className={`relative rounded border ${project?.color ? "" : "border-sky-200 bg-sky-50"}`}
                      style={
                        project?.color
                          ? { borderColor: project.color, backgroundColor: withAlpha(project.color, "1a") }
                          : undefined
                      }
                    >
                      <a
                        href={event.htmlLink ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate px-2 py-1 pr-4 text-xs font-medium text-slate-700 hover:bg-black/5"
                      >
                        {event.title}
                      </a>
                      <ProjectTagDot event={event} projects={projects} projectById={projectById} onTag={tagEvent} />
                    </div>
                  );
                })}
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

                {showNowLine && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: `${nowLineTopPct}%` }}
                  >
                    <div className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <div className="h-px w-full bg-red-500" />
                  </div>
                )}

                {positionedEvents.map(({ event, topPct, heightPct, left, width }) => {
                  const project = event.projectId ? projectById.get(event.projectId) : null;
                  const upcoming = upcomingEventIds.has(event.id);
                  return (
                    <div
                      key={event.id}
                      className={`absolute overflow-hidden rounded border ${
                        project?.color ? "" : "border-sky-200 bg-sky-50"
                      } ${upcoming ? "glow-upcoming" : ""}`}
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        minHeight: MIN_EVENT_HEIGHT,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        ...(project?.color
                          ? { borderColor: project.color, backgroundColor: withAlpha(project.color, "26") }
                          : {}),
                      }}
                      title={`${event.title} (${formatTime(event.start)} - ${formatTime(event.end)})`}
                    >
                      <a
                        href={event.htmlLink ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-full w-full px-1 text-[11px] leading-tight hover:bg-black/5"
                      >
                        <div className="pr-3 font-medium text-slate-800">{event.title}</div>
                        <div className="text-slate-500">{formatTime(event.start)}</div>
                      </a>
                      <ProjectTagDot event={event} projects={projects} projectById={projectById} onTag={tagEvent} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
