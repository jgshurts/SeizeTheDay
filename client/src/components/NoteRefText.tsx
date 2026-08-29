import { Fragment } from "react";
import { parseNoteRefs } from "../lib/noteRefs";
import { NoteRefBadge } from "./NoteRefBadge";

// Renders plain text (e.g. a task description) with any "@REF" note
// references turned into hoverable NoteRefBadges. For markdown text (note
// bodies), use toMarkdownNoteRefLinks + a custom `a` renderer instead.
export function NoteRefText({ text }: { text: string }) {
  return (
    <>
      {parseNoteRefs(text).map((part, i) =>
        part.type === "text" ? (
          <Fragment key={i}>{part.value}</Fragment>
        ) : (
          <NoteRefBadge key={i} shortRef={part.shortRef} />
        ),
      )}
    </>
  );
}
