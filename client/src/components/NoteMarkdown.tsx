import type { ReactNode } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import { toMarkdownNoteRefLinks } from "../lib/noteRefs";
import { NoteRefBadge } from "./NoteRefBadge";

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

export function NoteMarkdown({ text }: { text: string }) {
  return (
    <Markdown components={noteMarkdownComponents} urlTransform={noteMarkdownUrlTransform}>
      {toMarkdownNoteRefLinks(text)}
    </Markdown>
  );
}
