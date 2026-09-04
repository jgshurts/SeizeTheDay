import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../lib/api";
import { addDays, toLocalDateKey } from "../lib/date";
import type { Project, Task } from "../types";

type SortKey = "completedAt" | "priorityGroup" | "priority" | "description" | "project";
type SortDirection = "asc" | "desc";

const NONE = "";

interface Column {
  key: SortKey;
  label: string;
}

const COLUMNS: Column[] = [
  { key: "completedAt", label: "Date Completed" },
  { key: "priorityGroup", label: "PG" },
  { key: "priority", label: "PR" },
  { key: "description", label: "Description" },
  { key: "project", label: "Project" },
];

function sortValue(task: Task, key: SortKey): string | number {
  switch (key) {
    case "completedAt":
      return task.completedAt ?? "";
    case "priorityGroup":
      return task.priorityGroup?.prty ?? Infinity;
    case "priority":
      return task.prtyOrdinal ?? Infinity;
    case "description":
      return task.description.toLowerCase();
    case "project":
      return task.project?.name.toLowerCase() ?? "";
  }
}

function sortTasks(tasks: Task[], key: SortKey, direction: SortDirection): Task[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va < vb) return -1 * sign;
    if (va > vb) return 1 * sign;
    return 0;
  });
}

// completedAt is a real timestamp, not a date-only key -- format it from
// the browser's local time zone (like toLocalDateKey) rather than treating
// it as a UTC date key.
function formatCompletedAt(completedAt: string): string {
  return new Date(completedAt).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// mm/dd/yyyy -- Excel only recognizes a cell as a sortable date in this (or
// its own locale's) numeric form, not the "Mon, Sep 1, 2026" display format
// used in the on-screen table.
function formatCompletedAtForExport(completedAt: string): string {
  const d = new Date(completedAt);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}/${day}/${d.getFullYear()}`;
}

// Quotes/escapes a field for CSV per RFC 4180 -- Excel opens .csv files
// natively, so this avoids pulling in a full xlsx-writing dependency just
// for a report export.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(tasks: Task[]): void {
  const header = ["Date Completed", "Priority Group", "Priority", "Description", "Project", "Status"];
  const rows = tasks.map((t) => [
    t.completedAt ? formatCompletedAtForExport(t.completedAt) : "",
    t.priorityGroup?.prtyCode ?? "",
    t.prtyOrdinal != null ? String(t.prtyOrdinal) : "",
    t.description,
    t.project?.name ?? "",
    t.status?.statusCode ?? "",
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `completed-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function CompletedTasksReport({
  projects,
  onClose,
}: {
  projects: Project[];
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  // Defaults to the last 7 days (today and the 6 days before it).
  const [fromDate, setFromDate] = useState(() => addDays(toLocalDateKey(new Date()), -6));
  const [toDate, setToDate] = useState(() => toLocalDateKey(new Date()));
  const [sortKey, setSortKey] = useState<SortKey>("completedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (fromDate) params.set("startDate", fromDate);
    if (toDate) params.set("endDate", toDate);
    const query = params.toString();
    api
      .get<Task[]>(`/tasks/completed${query ? `?${query}` : ""}`)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [projectId, fromDate, toDate]);

  const sorted = useMemo(() => sortTasks(tasks, sortKey, sortDirection), [tasks, sortKey, sortDirection]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return (
    <Modal title="Completed Tasks" onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter by project"
            value={projectId ?? NONE}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={NONE}>All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1 text-sm text-slate-600">
            From
            <input
              type="date"
              aria-label="From date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>

          <label className="flex items-center gap-1 text-sm text-slate-600">
            To
            <input
              type="date"
              aria-label="To date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => downloadCsv(sorted)}
          disabled={sorted.length === 0}
          className="flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} />
          Export to Excel
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No completed tasks found.</p>
      ) : (
        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-2 py-1.5 font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      {col.label}
                      {sortKey === col.key &&
                        (sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                    {t.completedAt ? formatCompletedAt(t.completedAt) : ""}
                  </td>
                  <td className="px-2 py-1.5 text-slate-700">{t.priorityGroup?.prtyCode ?? ""}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.prtyOrdinal ?? ""}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.description}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.project?.name ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
