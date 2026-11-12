// mm/dd/yyyy -- Excel only recognizes a cell as a sortable date in this (or
// its own locale's) numeric form, not the "Mon, Sep 1, 2026" display format
// used in on-screen tables.
export function formatDatePlannedForExport(datePlanned: string): string {
  const d = new Date(datePlanned);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${d.getUTCFullYear()}`;
}

// Quotes/escapes a field for CSV per RFC 4180 -- Excel opens .csv files
// natively, so this avoids pulling in a full xlsx-writing dependency.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadCsvFile(filename: string, header: string[], rows: string[][]): void {
  const csv = [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
