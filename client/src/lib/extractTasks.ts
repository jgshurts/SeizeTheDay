// Lines of a note that start with a '*' bullet, minus the bullet itself.
// Blank bullets are skipped.
export function parseBulletTasks(noteText: string | null | undefined): string[] {
  return (noteText ?? "")
    .split(/\r?\n/)
    .map((line) => /^\s*\*\s+(.*\S)\s*$/.exec(line)?.[1])
    .filter((text): text is string => !!text);
}
