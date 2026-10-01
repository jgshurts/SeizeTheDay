import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StickyNotePlus } from "lucide-react";
import { api } from "../lib/api";
import { useIsMobile } from "../lib/useIsMobile";
import { MobileTextEditor } from "./MobileTextEditor";
import { withAlpha } from "../lib/color";
import { NoteMarkdown } from "./NoteMarkdown";
import { NoteRefPill } from "./NoteRefPill";
import { NoteDialog } from "./NoteDialog";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { ColumnHeader, ADD_BUTTON_CLASS } from "./ColumnHeader";
import type { Note, Project } from "../types";

const NONE = "";

// Clicks on these inside a tile do their own thing (copy the ref, change the
// project, delete, follow a link) rather than opening the note.
const TILE_INTERACTIVE_SELECTOR = "a, button, select";

// Fades out the last lines of a clipped preview. A mask rather than a
// gradient overlay, so it works over any project tint behind the tile.
const PREVIEW_FADE = "linear-gradient(to bottom, black 60%, transparent)";

// One note as a compact tile: header controls plus a preview clipped to
// roughly the first ten lines. Long notes (e.g. pasted plans) used to take
// the whole column's height; the full note opens in NoteDialog instead.
function NoteTile({
  note,
  projects,
  onOpen,
  onUpdateNote,
  onDeleteNote,
}: {
  note: Note;
  projects: Project[];
  onOpen: () => void;
  onUpdateNote: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  // Re-measured on resize too -- dragging the Tasks/Notes divider changes
  // how many lines the same text wraps to.
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [note.noteText]);

  const createdAt = new Date(note.createdAt);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Open note"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest(TILE_INTERACTIVE_SELECTOR)) onOpen();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer flex-col rounded border p-2 hover:shadow-md focus-visible:outline-2 focus-visible:outline-indigo-500 ${
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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-1">
          <select
            aria-label="Note project"
            value={note.projectId ?? NONE}
            onChange={(e) => onUpdateNote(note.id, { projectId: e.target.value || null })}
            className="max-w-[9rem] rounded border border-slate-200 bg-white px-1 py-0.5"
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
          <span title={createdAt.toLocaleString()}>
            {createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
          <ConfirmDeleteButton label="Delete note" onConfirm={() => onDeleteNote(note.id)} />
        </span>
      </div>

      <div
        ref={previewRef}
        className="prose prose-sm max-h-[13rem] max-w-none overflow-hidden px-1 prose-p:my-1 prose-p:leading-snug prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:leading-snug"
        style={clipped ? { maskImage: PREVIEW_FADE, WebkitMaskImage: PREVIEW_FADE } : undefined}
      >
        {note.noteText ? (
          <NoteMarkdown text={note.noteText} />
        ) : (
          <span className="text-slate-400">Click to add note text...</span>
        )}
      </div>
      {clipped && (
        <span className="mt-1 self-end text-xs font-medium text-indigo-600">Show full note →</span>
      )}
    </div>
  );
}

interface NotesColumnProps {
  activeDate: string;
  projects: Project[];
  // Comma-separated project ids the Banner is filtering to ("" for all).
  projectFilterKey: string;
  defaultProjectId: string | null;
  subBannerColor: string | null | undefined;
}

export function NotesColumn({
  activeDate,
  projects,
  projectFilterKey,
  defaultProjectId,
  subBannerColor,
}: NotesColumnProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  // Mobile only -- the note being edited in MobileTextEditor.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<{ id: string; startEditing: boolean } | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const projectParam = projectFilterKey ? `&projectId=${projectFilterKey}` : "";
    api.get<Note[]>(`/notes?date=${activeDate}${projectParam}`).then(setNotes);
  }, [activeDate, projectFilterKey]);

  async function addNote() {
    const note = await api.post<Note>("/notes", {
      contextDate: activeDate,
      projectId: defaultProjectId,
    });
    setNotes((prev) => [...prev, note]);
    if (isMobile) {
      setEditingNoteId(note.id);
    } else {
      setOpenNote({ id: note.id, startEditing: true });
    }
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
  }, [activeDate, defaultProjectId, isMobile]);

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

      <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] content-start gap-2 overflow-y-auto">
        {notes.map((note) => (
          <NoteTile
            key={note.id}
            note={note}
            projects={projects}
            onOpen={() => setOpenNote({ id: note.id, startEditing: false })}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
          />
        ))}
      </div>

      {(() => {
        const note = openNote && notes.find((n) => n.id === openNote.id);
        if (!note) return null;
        return (
          <NoteDialog
            key={note.id}
            note={note}
            projects={projects}
            startEditing={openNote.startEditing}
            onEditExternally={
              isMobile
                ? () => {
                    setOpenNote(null);
                    setEditingNoteId(note.id);
                  }
                : undefined
            }
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onClose={() => setOpenNote(null)}
          />
        );
      })()}

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
