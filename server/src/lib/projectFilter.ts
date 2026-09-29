// Turns a `projectId` query param into a Prisma where-fragment. Accepts a
// single id or a comma-separated list, so the Banner can filter to "this or
// that" project; missing or empty means no project filter at all.
export function projectIdFilter(value: unknown) {
  if (typeof value !== "string") return {};
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) return {};
  return { projectId: { in: ids.map((id) => BigInt(id)) } };
}
