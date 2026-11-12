import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../lib/api";
import { addDays, formatDisplay, toLocalDateKey } from "../lib/date";
import { downloadTaskReportXlsx } from "../lib/taskReportXlsx";
import { stripNoteRefs } from "../lib/noteRefs";
import { groupTasksForReport } from "../lib/taskReport";
import type { Project, Task } from "../types";

const NONE = "";

export function TaskReportDialog({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  // Defaults to the last 7 days (today and the 6 days before it).
  const [fromDate, setFromDate] = useState(() => addDays(toLocalDateKey(new Date()), -6));
  const [toDate, setToDate] = useState(() => toLocalDateKey(new Date()));

  useEffect(() => {
    if (!fromDate || !toDate || fromDate > toDate) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ status: "all", startDate: fromDate, endDate: toDate });
    if (projectId) params.set("projectId", projectId);
    api
      .get<Task[]>(`/tasks/export?${params.toString()}`)
      .then((fetched) => {
        if (!cancelled) setTasks(fetched);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, fromDate, toDate]);

  const groups = useMemo(() => groupTasksForReport(tasks), [tasks]);
  const showProject = projectId === null;

  async function exportXlsx() {
    await downloadTaskReportXlsx({
      filename: `task-report-${fromDate}-to-${toDate}.xlsx`,
      fromDate,
      toDate,
      projectName: projects.find((p) => p.id === projectId)?.name ?? "All Projects",
      groups: groups.map((g) => ({
        key: g.key,
        label: g.label,
        rows: g.tasks.map((t) => ({
          date: t.datePlanned,
          description: stripNoteRefs(t.description),
          project: t.project?.name ?? "",
        })),
      })),
    });
  }

  return (
    <Modal title="Task Report" onClose={onClose} maxWidthClassName="max-w-[772px]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          onClick={exportXlsx}
          disabled={loading || tasks.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} />
          Export to Excel
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No tasks found in this range.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          {groups
            .filter((g) => g.tasks.length > 0)
            .map((g) => (
              <section key={g.key} className="mb-4 last:mb-0">
                <h3 className="mb-1 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-800">
                  {g.label} <span className="font-normal text-slate-500">({g.tasks.length})</span>
                </h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {g.tasks.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 last:border-0">
                        <td className="w-px whitespace-nowrap px-2 py-1 text-slate-500">
                          {formatDisplay(t.datePlanned.slice(0, 10))}
                        </td>
                        <td className="px-2 py-1 text-slate-700">{stripNoteRefs(t.description)}</td>
                        {showProject && <td className="px-2 py-1 text-slate-500">{t.project?.name ?? ""}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
        </div>
      )}
    </Modal>
  );
}
