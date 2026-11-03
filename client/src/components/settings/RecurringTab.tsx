import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { toLocalDateKey } from "../../lib/date";
import { MONTH_NAMES, WEEKDAY_NAMES, describeRule } from "../../lib/recurrence";
import type { PriorityGroup, Project, RecurrenceFrequency, RecurringTask } from "../../types";

interface FormState {
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[];
  monthDay: number;
  month: number;
  startDate: string;
  endDate: string;
  projectId: string;
  priorityGroupId: string;
  skipIfMissed: boolean;
}

function blankForm(today: string): FormState {
  return {
    description: "",
    frequency: "WEEKLY",
    interval: 1,
    weekdays: [],
    monthDay: 1,
    month: 1,
    startDate: today,
    endDate: "",
    projectId: "",
    priorityGroupId: "",
    skipIfMissed: false,
  };
}

function formFrom(series: RecurringTask): FormState {
  return {
    description: series.description,
    frequency: series.frequency,
    interval: series.interval,
    weekdays: series.weekdays,
    monthDay: series.monthDay ?? 1,
    month: series.month ?? 1,
    startDate: series.startDate,
    endDate: series.endDate ?? "",
    projectId: series.projectId ?? "",
    priorityGroupId: series.priorityGroupId ?? "",
    skipIfMissed: series.skipIfMissed,
  };
}

const UNIT: Record<RecurrenceFrequency, string> = {
  DAILY: "day(s)",
  WEEKLY: "week(s)",
  MONTHLY: "month(s)",
  YEARLY: "year(s)",
};

const inputClass = "rounded border border-slate-300 px-2 py-1";

interface RecurringTabProps {
  // Opens straight into editing this series (from a task's "Edit repeat" action).
  initialSeriesId?: string | null;
  // Called after anything that adds or removes tasks, so the day list reloads.
  onChanged: () => void;
}

export function RecurringTab({ initialSeriesId, onChanged }: RecurringTabProps) {
  const [series, setSeries] = useState<RecurringTask[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorityGroups, setPriorityGroups] = useState<PriorityGroup[]>([]);
  // null = list only; "new" = the add form; otherwise the id being edited.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(() => blankForm(toLocalDateKey(new Date())));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Project[]>("/projects").then(setProjects);
    api.get<PriorityGroup[]>("/priority-groups").then(setPriorityGroups);
    api.get<RecurringTask[]>("/recurring-tasks").then((loaded) => {
      setSeries(loaded);
      const target = initialSeriesId ? loaded.find((s) => s.id === initialSeriesId) : undefined;
      if (target) {
        setForm(formFrom(target));
        setEditing(target.id);
      }
    });
  }, [initialSeriesId]);

  function startNew() {
    setError(null);
    setForm(blankForm(toLocalDateKey(new Date())));
    setEditing("new");
  }

  function startEdit(s: RecurringTask) {
    setError(null);
    setForm(formFrom(s));
    setEditing(s.id);
  }

  const patch = (changes: Partial<FormState>) => setForm((f) => ({ ...f, ...changes }));

  function toggleWeekday(day: number) {
    patch({
      weekdays: form.weekdays.includes(day) ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day].sort(),
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.frequency === "WEEKLY" && form.weekdays.length === 0) {
      setError("Pick at least one weekday");
      return;
    }

    const body = {
      description: form.description,
      frequency: form.frequency,
      interval: form.interval,
      weekdays: form.frequency === "WEEKLY" ? form.weekdays : [],
      monthDay: form.frequency === "MONTHLY" || form.frequency === "YEARLY" ? form.monthDay : null,
      month: form.frequency === "YEARLY" ? form.month : null,
      startDate: form.startDate,
      endDate: form.endDate || null,
      projectId: form.projectId || null,
      priorityGroupId: form.priorityGroupId || null,
      skipIfMissed: form.skipIfMissed,
      today: toLocalDateKey(new Date()),
    };

    setBusy(true);
    try {
      if (editing === "new") {
        const created = await api.post<RecurringTask>("/recurring-tasks", body);
        setSeries((prev) => [...(prev ?? []), created].sort((a, b) => a.description.localeCompare(b.description)));
      } else {
        const updated = await api.patch<RecurringTask>(`/recurring-tasks/${editing}`, body);
        setSeries((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));
      }
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/recurring-tasks/${id}?today=${toLocalDateKey(new Date())}`);
      setSeries((prev) => (prev ?? []).filter((s) => s.id !== id));
      setConfirmingDeleteId(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  if (series === null) return null;

  if (editing !== null) {
    return (
      <form onSubmit={submit} className="max-w-xl space-y-3 text-sm text-slate-600">
        <h3 className="font-medium text-slate-700">
          {editing === "new" ? "New recurring task" : "Edit recurring task"}
        </h3>
        {error && <p className="text-red-600">{error}</p>}

        <label className="block">
          Task
          <input
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Take out the trash"
            required
            autoFocus
            className={`${inputClass} w-full`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span>Repeat every</span>
          <input
            type="number"
            min={1}
            max={365}
            value={form.interval}
            onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
            aria-label="Repeat interval"
            className={`${inputClass} w-16`}
          />
          <select
            value={form.frequency}
            onChange={(e) => patch({ frequency: e.target.value as RecurrenceFrequency })}
            aria-label="Repeat unit"
            className={inputClass}
          >
            {(Object.keys(UNIT) as RecurrenceFrequency[]).map((f) => (
              <option key={f} value={f}>
                {UNIT[f]}
              </option>
            ))}
          </select>
        </div>

        {form.frequency === "WEEKLY" && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Weekdays">
            {WEEKDAY_NAMES.map((name, day) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleWeekday(day)}
                aria-pressed={form.weekdays.includes(day)}
                className={`rounded border px-2 py-1 ${
                  form.weekdays.includes(day)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        )}

        {(form.frequency === "MONTHLY" || form.frequency === "YEARLY") && (
          <div className="flex flex-wrap items-center gap-2">
            <span>On</span>
            {form.frequency === "YEARLY" && (
              <select
                value={form.month}
                onChange={(e) => patch({ month: Number(e.target.value) })}
                aria-label="Month"
                className={inputClass}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={form.monthDay}
              onChange={(e) => patch({ monthDay: Number(e.target.value) })}
              aria-label="Day of the month"
              className={inputClass}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={-1}>last day</option>
            </select>
            <span className="text-xs text-slate-400">
              (a month without that day uses its last day)
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label>
            Starts{" "}
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label>
            Ends (optional){" "}
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label>
            Project{" "}
            <select value={form.projectId} onChange={(e) => patch({ projectId: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority group{" "}
            <select
              value={form.priorityGroupId}
              onChange={(e) => patch({ priorityGroupId: e.target.value })}
              className={inputClass}
            >
              <option value="">None</option>
              {priorityGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.prtyCode}
                  {g.description ? ` - ${g.description}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={form.skipIfMissed}
            onChange={(e) => patch({ skipIfMissed: e.target.checked })}
            className="mt-1"
          />
          <span>
            Skip it if I miss it
            <span className="block text-xs text-slate-400">
              An unfinished occurrence disappears once its day has passed, instead of waiting in your
              Unfinished list.
            </span>
          </span>
        </label>

        {editing !== "new" && (
          <p className="text-xs text-slate-400">
            Changing the schedule re-creates this task's upcoming unfinished days. Finished and past
            ones are kept.
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {editing === "new" ? "Add" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded px-3 py-1 text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="text-sm text-slate-600">
      <p className="mb-3 text-xs text-slate-500">
        A recurring task creates an ordinary task on each matching day, a couple of months ahead. Edit
        or finish any one of them like a normal task; use this list to change the whole series.
      </p>
      {error && <p className="mb-2 text-red-600">{error}</p>}
      {series.length === 0 ? (
        <p className="mb-3 text-slate-400">Nothing repeats yet.</p>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100">
          {series.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="truncate text-slate-800">{s.description}</div>
                <div className="text-xs text-slate-500">
                  {describeRule(s)}
                  {s.skipIfMissed ? " · skipped if missed" : ""}
                  {s.endDate ? ` · until ${s.endDate}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {confirmingDeleteId === s.id ? (
                  <span className="flex items-center gap-2 text-red-600">
                    Delete?
                    <button type="button" onClick={() => remove(s.id)} className="font-medium underline">
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
                      className="font-medium text-slate-500 underline"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={`Edit ${s.description}`}
                      onClick={() => startEdit(s)}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${s.description}`}
                      onClick={() => setConfirmingDeleteId(s.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={startNew}
        className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
      >
        New recurring task
      </button>
    </div>
  );
}
