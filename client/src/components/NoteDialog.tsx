import { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "./Modal";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { NoteMarkdown } from "./NoteMarkdown";
import { NoteRefPill } from "./NoteRefPill";
import type { Note, Project } from "../types";

const NONE = "";

// Full view of one note, rendered as Markdown, with room to edit it --
// NotesColumn's tiles only show the first few lines. Edits are saved only
// by an explicit Done; closing the dialog any other way (the X, Escape,
// clicking the backdrop) with unsaved changes asks whether to save them
// first, since those usually mean "go away" rather than "keep this".
export function NoteDialog({
  note,
  projects,
  startEditing,
  onEditExternally,
  onUpdateNote,
  onDeleteNote,
  onClose,
}: {
  note: Note;
  projects: Project[];
  startEditing: boolean;
  // Mobile hands editing off to MobileTextEditor instead of the textarea
  // below, which is cramped under an on-screen keyboard.
  onEditExternally?: () => void;
  onUpdateNote: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(startEditing && !onEditExternally);
  const [draft, setDraft] = useState(note.noteText ?? "");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const isDirty = editing && draft !== (note.noteText ?? "");

  function saveDraft() {
    if (isDirty) onUpdateNote(note.id, { noteText: draft });
  }

  // Escape or a backdrop click while the save prompt is already up just
  // dismisses the prompt, back to editing -- neither picks Yes or No.
  function requestClose() {
    if (confirmingClose) {
      setConfirmingClose(false);
    } else if (isDirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  }

  function startEdit() {
    if (onEditExternally) {
      onEditExternally();
      return;
    }
    setDraft(note.noteText ?? "");
    setEditing(true);
  }

  function finishEdit() {
    saveDraft();
    setEditing(false);
  }

  return (
    <Modal title="Note" onClose={requestClose} maxWidthClassName="max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <select
            aria-label="Note project"
            value={note.projectId ?? NONE}
            onChange={(e) => onUpdateNote(note.id, { projectId: e.target.value || null })}
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
          <span>{new Date(note.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <button
              type="button"
              onClick={finishEdit}
              className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          <ConfirmDeleteButton
            label="Delete note"
            iconSize={16}
            onConfirm={async () => {
              await onDeleteNote(note.id);
              onClose();
            }}
          />
        </div>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-[60vh] w-full resize-y rounded border border-slate-300 p-2 font-mono text-sm"
        />
      ) : (
        <div
          onClick={(e) => {
            // Let ordinary links in the note open without also starting an edit.
            if (!(e.target as HTMLElement).closest("a")) startEdit();
          }}
          className="prose prose-sm max-w-none cursor-text rounded p-1 hover:bg-black/5"
        >
          {note.noteText ? (
            <NoteMarkdown text={note.noteText} />
          ) : (
            <span className="text-slate-400">Click to add note text...</span>
          )}
        </div>
      )}

      {confirmingClose && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setConfirmingClose(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Save changes?"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-lg bg-white p-4 shadow-xl"
          >
            <p className="mb-4 text-sm text-slate-700">Do you want to save changes?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  saveDraft();
                  onClose();
                }}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
