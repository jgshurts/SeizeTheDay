import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Note, Project } from "../types";

const NONE = "";

export function NotesColumn() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Note[]>("/notes").then(setNotes);
    api.get<Project[]>("/projects").then(setProjects);
  }, []);

  async function addNote() {
    const note = await api.post<Note>("/notes", {});
    setNotes((prev) => [note, ...prev]);
    setEditingNoteId(note.id);
  }

  async function updateNote(id: string, patch: Record<string, unknown>) {
    const updated = await api.patch<Note>(`/notes/${id}`, patch);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
  }

  return (
    <section className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Notes</h2>
        <button
          type="button"
          onClick={addNote}
          className="flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> New note
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="rounded border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <select
                value={note.projectId ?? NONE}
                onChange={(e) => updateNote(note.id, { projectId: e.target.value || null })}
                className="rounded border border-slate-200 bg-white px-1 py-0.5"
              >
                <option value={NONE}>No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span>{new Date(note.createdAt).toLocaleString()}</span>
            </div>

            <input
              defaultValue={note.shortRef ?? ""}
              maxLength={10}
              placeholder="Short ref"
              onBlur={(e) => updateNote(note.id, { shortRef: e.target.value || null })}
              className="mb-2 w-32 rounded border border-transparent px-1 text-sm font-medium hover:border-slate-200 focus:border-slate-300"
            />

            {editingNoteId === note.id ? (
              <textarea
                autoFocus
                defaultValue={note.noteText ?? ""}
                onBlur={(e) => {
                  updateNote(note.id, { noteText: e.target.value });
                  setEditingNoteId(null);
                }}
                className="w-full rounded border border-slate-300 p-2 font-mono text-sm"
                rows={4}
              />
            ) : (
              <div
                onClick={() => setEditingNoteId(note.id)}
                className="prose prose-sm max-w-none cursor-text rounded p-1 hover:bg-slate-50"
              >
                {note.noteText ? (
                  <Markdown>{note.noteText}</Markdown>
                ) : (
                  <span className="text-slate-400">Click to add note text...</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
