import { hexToArgb, saveWorkbook } from "./xlsx";

export interface ExportXlsxRow {
  date: string;
  status: string;
  statusBackground: string | null;
  statusForeground: string | null;
  priorityGroup: string;
  priority: number | null;
  description: string;
  project: string;
}

// Formatted .xlsx of the Manage Tasks list, in the order given: styled
// header, frozen header row, filter buttons, real date cells, and the
// status cell tinted with the status's own colors. exceljs loads on demand.
export async function downloadTaskExportXlsx(filename: string, rows: ExportXlsxRow[]): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tasks", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Priority Group", key: "pg", width: 15 },
    { header: "Priority", key: "pr", width: 10 },
    { header: "Description", key: "description", width: 80 },
    { header: "Project", key: "project", width: 24 },
  ];

  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment = { vertical: "middle" };
  });

  for (const r of rows) {
    // UTC midnight so the cell holds the planned calendar date exactly.
    const row = sheet.addRow([
      new Date(`${r.date.slice(0, 10)}T00:00:00.000Z`),
      r.status,
      r.priorityGroup,
      r.priority,
      r.description,
      r.project,
    ]);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
    });
    row.getCell(1).numFmt = "mm/dd/yyyy";
    row.getCell(1).alignment = { vertical: "top", horizontal: "left" };
    row.getCell(3).alignment = { vertical: "top", horizontal: "center" };
    row.getCell(4).alignment = { vertical: "top", horizontal: "center" };

    const bg = hexToArgb(r.statusBackground);
    const fg = hexToArgb(r.statusForeground);
    const statusCell = row.getCell(2);
    if (bg) statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    if (fg) statusCell.font = { bold: true, color: { argb: fg } };
    statusCell.alignment = { vertical: "top", horizontal: "center" };
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };
  await saveWorkbook(workbook, filename);
}
