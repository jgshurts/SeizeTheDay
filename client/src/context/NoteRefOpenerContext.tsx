import { createContext, useContext } from "react";

// Opens the referenced note in the full NoteDialog, resolving to false when
// it couldn't (no such note, or the fetch failed). Provided around the
// Tasks column only: there a NoteRefBadge opens the note so it can be read
// and edited in full, while badges inside notes keep their quick popup
// preview instead of stacking a second dialog.
export type NoteRefOpener = (shortRef: string) => Promise<boolean>;

const NoteRefOpenerContext = createContext<NoteRefOpener | null>(null);

export const NoteRefOpenerProvider = NoteRefOpenerContext.Provider;

export function useNoteRefOpener(): NoteRefOpener | null {
  return useContext(NoteRefOpenerContext);
}
