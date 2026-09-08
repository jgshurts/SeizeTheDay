import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../lib/api";
import { formatDisplay } from "../lib/date";
import type { Project, Task } from "../types";

const NONE = "";

export function SearchTasksDialog({
  projects,
  onGoToDate,
  onClose,
}: {
  projects: Project[];
  onGoToDate: (date: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [results, setResults] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: trimmed, includeCompleted: String(includeCompleted) });
      if (projectId) params.set("projectId", projectId);
      const fetched = await api.get<Task[]>(`/tasks/search?${params.toString()}`);
      setResults(fetched);
    } finally {
      setLoading(false);
    }
  }

  function goToTask(task: Task) {
    onGoToDate(task.datePlanned.slice(0, 10));
    onClose();
  }

  return (
    <Modal title="Search Tasks" onClose={onClose} maxWidthClassName="max-w-[772px]">
      <form onSubmit={runSearch} className="mb-3 flex flex-wrap items-center gap-2">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search descriptions..."
          className="min-w-[200px] flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />

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
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => setIncludeCompleted(e.target.checked)}
          />
          Include completed
        </label>

        <button
          type="submit"
          className="flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Search size={14} />
          Search
        </button>
      </form>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Searching…</p>
      ) : results === null ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Search across every task, regardless of date.
        </p>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No matching tasks found.</p>
      ) : (
        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-1.5 font-medium text-slate-600">Date</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Status</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">PG</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">PR</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Description</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Project</th>
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {results.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                    {formatDisplay(t.datePlanned.slice(0, 10))}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: t.status?.backgroundColor ?? undefined,
                        color: t.status?.foregroundColor ?? undefined,
                      }}
                    >
                      {t.status?.statusCode ?? "-"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-700">{t.priorityGroup?.prtyCode ?? ""}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.prtyOrdinal ?? ""}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.description}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.project?.name ?? ""}</td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      aria-label={`Go to ${formatDisplay(t.datePlanned.slice(0, 10))}`}
                      title="Go to this day"
                      onClick={() => goToTask(t)}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
