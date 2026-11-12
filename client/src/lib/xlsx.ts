import type { Workbook } from "exceljs";

export async function saveWorkbook(workbook: Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// "#RRGGBB" -> ExcelJS "FFRRGGBB"; undefined for anything unparseable.
export function hexToArgb(hex: string | null | undefined): string | undefined {
  return hex && /^#[0-9a-f]{6}$/i.test(hex) ? `FF${hex.slice(1).toUpperCase()}` : undefined;
}
