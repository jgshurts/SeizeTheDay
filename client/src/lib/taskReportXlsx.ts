import type { ReportCategory } from "./taskReport";

export interface ReportXlsxGroup {
  key: ReportCategory;
  label: string;
  rows: { date: string; description: string; project: string }[];
}

// Section banner colors (ARGB) per status group.
const GROUP_COLORS: Record<ReportCategory, { bg: string; fg: string }> = {
  completed: { bg: "FFD1FAE5", fg: "FF065F46" },
  inProgress: { bg: "FFFEF3C7", fg: "FF92400E" },
  blocked: { bg: "FFFEE2E2", fg: "FF991B1B" },
  notStarted: { bg: "FFE5E7EB", fg: "FF374151" },
};

const THIN_BORDER = { style: "thin" as const, color: { argb: "FFE2E8F0" } };

// Builds a formatted .xlsx (title, section banners per status group, real
// date cells, wrapped descriptions) and downloads it. exceljs is loaded on
// demand so it stays out of the main bundle.
export async function downloadTaskReportXlsx(opts: {
  filename: string;
  fromDate: string;
  toDate: string;
  projectName: string;
  groups: ReportXlsxGroup[];
}): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Task Report", {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [
    { key: "date", width: 14 },
    { key: "description", width: 80 },
    { key: "project", width: 24 },
  ];

  const title = sheet.addRow(["Task Report"]);
  sheet.mergeCells(title.number, 1, title.number, 3);
  title.getCell(1).font = { bold: true, size: 16, color: { argb: "FF1E293B" } };
  title.height = 24;

  const subtitle = sheet.addRow([`${opts.fromDate} to ${opts.toDate}  ·  ${opts.projectName}`]);
  sheet.mergeCells(subtitle.number, 1, subtitle.number, 3);
  subtitle.getCell(1).font = { size: 11, color: { argb: "FF64748B" } };
  sheet.addRow([]);

  for (const group of opts.groups) {
    if (group.rows.length === 0) continue;
    const colors = GROUP_COLORS[group.key];

    const banner = sheet.addRow([`${group.label} (${group.rows.length})`]);
    sheet.mergeCells(banner.number, 1, banner.number, 3);
    banner.height = 20;
    const bannerCell = banner.getCell(1);
    bannerCell.font = { bold: true, size: 12, color: { argb: colors.fg } };
    bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.bg } };
    bannerCell.alignment = { vertical: "middle", indent: 1 };

    const header = sheet.addRow(["Date", "Description", "Project"]);
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF475569" } };
      cell.border = { bottom: { style: "medium", color: { argb: "FFCBD5E1" } } };
    });

    for (const r of group.rows) {
      // Parsed as UTC midnight so the cell holds the planned calendar date
      // exactly, with no time-zone shift.
      const row = sheet.addRow([new Date(`${r.date.slice(0, 10)}T00:00:00.000Z`), r.description, r.project]);
      row.getCell(1).numFmt = "mm/dd/yyyy";
      row.getCell(1).alignment = { horizontal: "left", vertical: "top" };
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(3).alignment = { wrapText: true, vertical: "top" };
      row.eachCell((cell) => {
        cell.border = { bottom: THIN_BORDER };
      });
    }
    sheet.addRow([]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = opts.filename;
  link.click();
  URL.revokeObjectURL(url);
}
