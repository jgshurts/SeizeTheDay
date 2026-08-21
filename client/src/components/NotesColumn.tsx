import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { ListPlus, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useIsMobile } from "../lib/useIsMobile";
import { MobileTextEditor } from "./MobileTextEditor";
import type { Note, Project, Task } from "../types";

const NONE = "";

interface NotesColumnProps {
  activeDate: string;
  projects: Project[];
  contextProjectId: string | null;
  onAddRelatedTask: (description: string, opts?: { noteId?: string }) => Promise<Task>;
}

export function NotesColumn({
  activeDate,
  projects,
  contextProjectId,
  onAddRelatedTask,
}: NotesColumnProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [addingTaskForNoteId, setAddingTaskForNoteId] = useState<string | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    api.get<Note[]>(`/notes?date=${activeDate}`).then(setNotes);
  }, [activeDate]);

  async function addNote() {
    const note = await api.post<Note>("/notes", {
      contextDate: activeDate,
      projectId: contextProjectId,
    });
    setNotes((prev) => [...prev, note]);
    setEditingNoteId(note.id);
  }

  // Ctrl/Cmd+N is reserved by the browser for opening a new window, so we
  // use Alt/Option+N instead -- see TasksColumn's Alt+T for the same reasoning.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === "KeyN") {
        e.preventDefault();
        addNote();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDate, contextProjectId]);

  async function updateNote(id: string, patch: Record<string, unknown>) {
    const updated = await api.patch<Note>(`/notes/${id}`, patch);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
  }

  async function deleteNote(id: string) {
    await api.delete(`/notes/${id}`);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function submitRelatedTask(noteId: string) {
    if (!newTaskDescription.trim()) {
      setAddingTaskForNoteId(null);
      return;
    }
    await onAddRelatedTask(newTaskDescription.trim(), { noteId });
    setNewTaskDescription("");
    setAddingTaskForNoteId(null);
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="rounded border border-yellow-200 bg-yellow-50 p-3">
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
              <span className="flex items-center gap-2">
                {new Date(note.createdAt).toLocaleString()}
                <button
                  type="button"
                  aria-label="Delete note"
                  onClick={() => deleteNote(note.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>

            <input
              defaultValue={note.shortRef ?? ""}
              maxLength={10}
              placeholder="Short ref"
              onBlur={(e) => updateNote(note.id, { shortRef: e.target.value || null })}
              className="mb-2 w-32 rounded border border-transparent px-1 text-sm font-medium hover:border-slate-200 focus:border-slate-300"
            />

            {editingNoteId === note.id && !isMobile ? (
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
                className="prose prose-sm max-w-none cursor-text rounded p-1 hover:bg-yellow-100"
              >
                {note.noteText ? (
                  <Markdown>{note.noteText}</Markdown>
                ) : (
                  <span className="text-slate-400">Click to add note text...</span>
                )}
              </div>
            )}

            {addingTaskForNoteId === note.id ? (
              <input
                autoFocus
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                onBlur={() => submitRelatedTask(note.id)}
                onKeyDown={(e) => e.key === "Enter" && submitRelatedTask(note.id)}
                placeholder="Related task description"
                className="mt-2 w-full rounded border border-slate-300 px-1 py-0.5 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddingTaskForNoteId(note.id);
                  setNewTaskDescription("");
                }}
                className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                <ListPlus size={12} /> Add related task
              </button>
            )}
          </div>
        ))}
      </div>

      {isMobile &&
        (() => {
          const editingNote = notes.find((n) => n.id === editingNoteId);
          if (!editingNote) return null;
          return (
            <MobileTextEditor
              title="Edit Note"
              initialValue={editingNote.noteText ?? ""}
              onSave={(noteText) => {
                updateNote(editingNote.id, { noteText });
                setEditingNoteId(null);
              }}
              projects={projects}
              projectId={editingNote.projectId}
              onProjectChange={(projectId) => {
                updateNote(editingNote.id, { projectId });
              }}
            />
          );
        })()}
    </section>
  );
}
