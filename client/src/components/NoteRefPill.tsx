import { useState } from "react";
import { Check, Copy } from "lucide-react";

// A note's ref is generated once at creation and never edited (see
// server's notes route) -- this just displays it and lets you copy it as
// "@REF", ready to paste straight into another note or task description.
export function NoteRefPill({ shortRef }: { shortRef: string }) {
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
