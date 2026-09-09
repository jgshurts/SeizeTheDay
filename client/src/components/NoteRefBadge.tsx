import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { lighten } from "../lib/color";
import { DEFAULT_SUB_BANNER_COLOR } from "./ColumnHeader";
import type { Note } from "../types";

// 20% lighter than the user's theme background (or the app default, if they
// haven't set one) -- readable black-on-light instead of the previous fixed
// gray-on-black, and still visually tied to their chosen theme.
const POPUP_LIGHTEN_PERCENT = 20;

interface NoteRefBadgeProps {
  shortRef: string;
}

type RefState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; note: Note }
  | { status: "not-found" }
  | { status: "error" };

// Shared across every badge on the page so opening the same ref twice
// (e.g. once in a task, once in a note) doesn't refetch it.
const noteRefCache = new Map<string, Promise<Note | null>>();

function fetchNoteByRef(shortRef: string): Promise<Note | null> {
  const key = shortRef.toLowerCase();
  let cached = noteRefCache.get(key);
  if (!cached) {
    cached = api.get<Note>(`/notes/by-ref/${encodeURIComponent(shortRef)}`).catch((err) => {
      if (err instanceof ApiError && err.status === 404) return null;
      noteRefCache.delete(key);
      throw err;
    });
    noteRefCache.set(key, cached);
  }
  return cached;
}

// Renders "@REF" as a small pill that, on click, fetches and previews the
// referenced note -- the note is likely written on a different day-page, so
// this is the only way to see it without navigating away. The popup is
// portaled to <body> and positioned from the pill's own bounding rect,
// because it otherwise ends up nested inside ancestors that clip it (a
// truncated task-description cell, the tasks table's scrolling wrapper).
export function NoteRefBadge({ shortRef }: NoteRefBadgeProps) {
  const { user } = useAuth();
  const popupBackground = lighten(
    user?.themeBackgroundColor ?? DEFAULT_SUB_BANNER_COLOR,
    POPUP_LIGHTEN_PERCENT,
  );
  const [state, setState] = useState<RefState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
    if (state.status === "idle") {
      setState({ status: "loading" });
      fetchNoteByRef(shortRef)
        .then((note) => setState(note ? { status: "found", note } : { status: "not-found" }))
        .catch(() => setState({ status: "error" }));
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside() {
      setOpen(false);
    }
    // Capture phase + next tick so the click that opened the popup (which
    // is still bubbling right now) doesn't immediately close it again.
    const id = window.setTimeout(() => {
      document.addEventListener("click", handleOutside);
      window.addEventListener("scroll", handleOutside, true);
    }, 0);
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={badgeRef}
      onClick={handleClick}
      className="cursor-pointer rounded bg-indigo-100 px-1 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200"
    >
      {shortRef}
      {open &&
        position &&
        createPortal(
          <div
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
            style={{ top: position.top, left: position.left, backgroundColor: popupBackground }}
            className="fixed z-50 w-[640px] max-w-[90vw] rounded px-2 py-1.5 text-left text-xs normal-case text-black shadow-lg"
          >
            {state.status === "loading" && "Loading..."}
            {state.status === "error" && "Failed to load note."}
            {state.status === "not-found" && `No note found for @${shortRef}.`}
            {state.status === "found" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{new Date(state.note.createdAt).toLocaleDateString()}</span>
                  {state.note.project && <span>{state.note.project.name}</span>}
                </div>
                {state.note.noteText ? (
                  <div className="prose prose-sm max-w-none text-black [&>*]:my-0.5">
                    <Markdown>{state.note.noteText}</Markdown>
                  </div>
                ) : (
                  <span className="italic text-slate-600">No note text</span>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
