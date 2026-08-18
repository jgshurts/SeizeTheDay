// Parses a YYYY-MM-DD query/body value into a UTC-midnight Date, matching
// how Prisma stores our @db.Date columns (date_planned, context_date).
export function parseDateParam(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}
