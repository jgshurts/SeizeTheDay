import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import { Check, Copy, StickyNotePlus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useIsMobile } from "../lib/useIsMobile";
import { MobileTextEditor } from "./MobileTextEditor";
import { withAlpha } from "../lib/color";
import { toMarkdownNoteRefLinks } from "../lib/noteRefs";
import { NoteRefBadge } from "./NoteRefBadge";
import { ColumnHeader, ADD_BUTTON_CLASS } from "./ColumnHeader";
import type { Note, Project } from "../types";

// Intercepts the fake "noteref:" links toMarkdownNoteRefLinks produces and
// renders a NoteRefBadge instead of a real anchor; anything else (a normal
// markdown link) renders as usual. Defined once at module scope so the
// `components` prop identity stays stable across renders.
function NoteRefAwareLink({ href, children }: { href?: string; children?: ReactNode }) {
  if (href?.startsWith("noteref:")) {
    return <NoteRefBadge shortRef={href.slice("noteref:".length)} />;
  }
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

const noteMarkdownComponents = { a: NoteRefAwareLink };

// react-markdown's default URL sanitizer strips any protocol it doesn't
// recognize (http/https/mailto/tel), which silently rewrites our "noteref:"
// links to an empty href -- pass those through untouched and sanitize
// everything else as usual.
function noteMarkdownUrlTransform(url: string): string {
  return url.startsWith("noteref:") ? url : defaultUrlTransform(url);
}

// A note's ref is generated once at creation and never edited (see
// server's notes route) -- this just displays it and lets you copy it as
// "@REF", ready to paste straight into another note or task description.
function NoteRefPill({ shortRef }: { shortRef: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`@${shortRef}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) --
      // nothing useful to recover into if so.
    }
  }

  return (
    <span className="flex items-center gap-1 rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">
      {shortRef}
      <button
        type="button"
        aria-label="Copy note reference"
        onClick={handleCopy}
        className="text-slate-400 hover:text-slate-600"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </span>
  );
}

const NONE = "";

interface NotesColumnProps {
  activeDate: string;
  projects: Project[];
  contextProjectId: string | null;
  subBannerColor: string | null | undefined;
}

export function NotesColumn({
  activeDate,
  projects,
  contextProjectId,
  subBannerColor,
}: NotesColumnProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const projectParam = contextProjectId ? `&projectId=${contextProjectId}` : "";
    api.get<Note[]>(`/notes?date=${activeDate}${projectParam}`).then(setNotes);
  }, [activeDate, contextProjectId]);

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

  return (
    <section className="flex h-full min-h-0 flex-col">
      <ColumnHeader label="Notes" color={subBannerColor}>
        <button type="button" onClick={addNote} className={ADD_BUTTON_CLASS}>
          <StickyNotePlus size={16} /> New Note
        </button>
      </ColumnHeader>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`rounded border p-3 ${
              note.project?.color ? "" : "border-yellow-200 bg-yellow-50"
            }`}
            style={
              note.project?.color
                ? {
                    borderColor: note.project.color,
                    backgroundColor: withAlpha(note.project.color, "14"),
                  }
                : undefined
            }
          >
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
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
                {note.shortRef && <NoteRefPill shortRef={note.shortRef} />}
              </div>
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
                className="prose prose-sm max-w-none cursor-text rounded p-1 hover:bg-black/5 prose-p:my-1 prose-p:leading-snug prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:leading-snug"
              >
                {note.noteText ? (
                  <Markdown
                    components={noteMarkdownComponents}
                    urlTransform={noteMarkdownUrlTransform}
                  >
                    {toMarkdownNoteRefLinks(note.noteText)}
                  </Markdown>
                ) : (
                  <span className="text-slate-400">Click to add note text...</span>
                )}
              </div>
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
