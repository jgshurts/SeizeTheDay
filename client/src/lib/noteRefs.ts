// Inline note references, written as "@REF" in a task description or
// another note -- e.g. "@CDI-DASH" -- matching a Note's short ref.
// Restricted to id-like characters, both so a ref can never break markdown
// link syntax when embedded as a link target (see toMarkdownNoteRefLinks)
// and so the pattern has an unambiguous end without a closing delimiter.
// The lookbehind keeps this from firing inside an email-like "name@host".
const NOTE_REF_PATTERN = /(?<![A-Za-z0-9_])@([A-Za-z0-9_.-]{1,10})/g;

export type NoteRefPart = { type: "text"; value: string } | { type: "ref"; shortRef: string };

export function parseNoteRefs(text: string): NoteRefPart[] {
  const parts: NoteRefPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(NOTE_REF_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, index) });
    parts.push({ type: "ref", shortRef: match[1] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  return parts;
}

// Markdown has no native "mention" syntax, so refs are rewritten as links
// with a fake "noteref:" protocol before being handed to react-markdown --
// the caller then overrides the `a` renderer to intercept that protocol
// and render a NoteRefBadge instead of an anchor.
export function toMarkdownNoteRefLinks(text: string): string {
  return text.replace(NOTE_REF_PATTERN, (_match, shortRef: string) => `[@${shortRef}](noteref:${shortRef})`);
}
