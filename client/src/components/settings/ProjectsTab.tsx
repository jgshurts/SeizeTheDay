import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { Project } from "../../types";

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Project[]>("/projects").then(setProjects);
  }, []);

  async function addProject() {
    setError(null);
    try {
      const project = await api.post<Project>("/projects", {
        name: draftName,
        description: draftDescription || null,
      });
      setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
      setDraftName("");
      setDraftDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add project");
    }
  }

  async function updateProject(id: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      const updated = await api.patch<Project>(`/projects/${id}`, patch);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update project");
    }
  }

  async function deleteProject(id: string) {
    setError(null);
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete project");
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="w-40 px-2 py-1">Name</th>
            <th className="px-2 py-1">Description</th>
            <th className="w-8 px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="px-2 py-1">
                <input
                  defaultValue={p.name}
                  onBlur={(e) => updateProject(p.id, { name: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={p.description ?? ""}
                  onBlur={(e) => updateProject(p.id, { description: e.target.value || null })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  aria-label="Delete project"
                  onClick={() => deleteProject(p.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-t border-slate-200">
            <td className="px-2 py-1">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1">
              <input
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1" />
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={addProject}
        disabled={!draftName}
        className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Add project
      </button>
    </div>
  );
}
