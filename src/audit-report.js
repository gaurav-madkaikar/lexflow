import ExcelJS from 'exceljs';

const MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const INK = 'FF19191B';
const MUTED = 'FF73737A';
const LINE = 'FFE2E2E5';
const SOFT = 'FFF5F5F6';
const ACCENT = 'FFC94B31';

function safeCellText(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function safeFilenamePart(value) {
  return String(value ?? 'audit')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'audit';
}

function styleTitle(sheet, title, subtitle) {
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = title;
  sheet.getCell('A2').font = { name: 'Aptos', size: 16, bold: true, color: INK };
  sheet.getCell('A2').alignment = { vertical: 'middle' };
  sheet.getRow(2).height = 28;

  sheet.mergeCells('A3:H3');
  sheet.getCell('A3').value = subtitle;
  sheet.getCell('A3').font = { name: 'Aptos', size: 10, color: MUTED, italic: true };
  sheet.getRow(3).height = 20;
}

function applyHeader(row) {
  row.height = 24;
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: ACCENT } } };
  });
}

export function auditReportFilename(departmentName, generatedAt = new Date()) {
  return `lexflow-${safeFilenamePart(departmentName)}-audit-${generatedAt.toISOString().slice(0, 10)}.xlsx`;
}

export async function createAuditReportWorkbook({
  organizationName,
  departmentName,
  timezone,
  activity,
  generatedAt = new Date(),
}) {
  const rows = Array.isArray(activity) ? activity : [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LexFlow';
  workbook.company = safeCellText(organizationName || 'LexFlow');
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;

  const summary = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: INK } },
  });
  summary.columns = [
    { key: 'label', width: 28 },
    { key: 'value', width: 34 },
    { key: 'spacer', width: 3 },
    { key: 'kind', width: 24 },
    { key: 'count', width: 14 },
  ];
  styleTitle(
    summary,
    'Audit report',
    `${safeCellText(organizationName)} · ${safeCellText(departmentName)}`,
  );
  const summaryRows = [
    ['Generated at (UTC)', generatedAt],
    ['Reporting timezone', safeCellText(timezone || 'UTC')],
    ['Department', safeCellText(departmentName)],
    ['Total events', rows.length],
  ];
  summaryRows.forEach(([label, value], index) => {
    summary.getCell(6 + index, 1).value = label;
    summary.getCell(6 + index, 2).value = value;
  });
  summary.getCell('B6').numFmt = 'yyyy-mm-dd hh:mm:ss';
  for (let rowNumber = 6; rowNumber <= 9; rowNumber += 1) {
    summary.getCell(`A${rowNumber}`).font = { name: 'Aptos', size: 10, bold: true, color: INK };
    summary.getCell(`B${rowNumber}`).font = { name: 'Aptos', size: 10, color: INK };
    summary.getRow(rowNumber).height = 22;
  }
  summary.getCell('D6').value = 'Event type';
  summary.getCell('E6').value = 'Count';
  applyHeader(summary.getRow(6));
  summary.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
  summary.getCell('A6').font = { name: 'Aptos', size: 10, bold: true, color: INK };
  summary.getCell('B6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
  summary.getCell('B6').font = { name: 'Aptos', size: 10, color: INK };
  const counts = rows.reduce((totals, item) => {
    const kind = item.kind === 'completed' ? 'Completed' : 'Assigned';
    totals[kind] = (totals[kind] ?? 0) + 1;
    return totals;
  }, {});
  summary.getCell('D7').value = 'Assigned';
  summary.getCell('E7').value = counts.Assigned ?? 0;
  summary.getCell('D8').value = 'Completed';
  summary.getCell('E8').value = counts.Completed ?? 0;
  for (const rowNumber of [7, 8]) {
    summary.getCell(`D${rowNumber}`).font = { name: 'Aptos', size: 10, color: INK };
    summary.getCell(`E${rowNumber}`).font = { name: 'Aptos', size: 10, color: INK };
    summary.getCell(`E${rowNumber}`).numFmt = '#,##0';
  }

  const audit = workbook.addWorksheet('Audit log', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  audit.columns = [
    { key: 'id', width: 12 },
    { key: 'createdAt', width: 22 },
    { key: 'kind', width: 14 },
    { key: 'actorName', width: 24 },
    { key: 'actorEmail', width: 30 },
    { key: 'emailId', width: 12 },
    { key: 'subject', width: 44 },
    { key: 'message', width: 64 },
  ];
  styleTitle(
    audit,
    'Audit log',
    `${safeCellText(organizationName)} · ${safeCellText(departmentName)} · ${rows.length.toLocaleString('en-US')} events`,
  );
  audit.getRow(5).values = [
    'Audit ID',
    'Occurred at (UTC)',
    'Event',
    'Actor',
    'Actor email',
    'Email ID',
    'Subject',
    'Details',
  ];
  applyHeader(audit.getRow(5));

  for (const item of rows) {
    const date = new Date(item.createdAt);
    audit.addRow({
      id: Number(item.id),
      createdAt: Number.isNaN(date.getTime()) ? null : date,
      kind: item.kind === 'completed' ? 'Completed' : 'Assigned',
      actorName: safeCellText(item.actorName || 'LexFlow'),
      actorEmail: safeCellText(item.actorEmail || 'Not recorded'),
      emailId: item.emailId == null ? null : Number(item.emailId),
      subject: safeCellText(item.subject),
      message: safeCellText(item.message),
    });
  }

  const lastRow = Math.max(5, audit.rowCount);
  audit.getColumn('createdAt').numFmt = 'yyyy-mm-dd hh:mm:ss';
  audit.getColumn('id').numFmt = '#,##0';
  audit.getColumn('emailId').numFmt = '#,##0';
  for (let rowNumber = 6; rowNumber <= lastRow; rowNumber += 1) {
    const row = audit.getRow(rowNumber);
    row.height = 34;
    row.font = { name: 'Aptos', size: 10, color: INK };
    row.alignment = { vertical: 'middle' };
    row.getCell(7).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(8).alignment = { vertical: 'middle', wrapText: true };
    row.eachCell(cell => {
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
      }
      cell.border = { bottom: { style: 'hair', color: { argb: LINE } } };
    });
  }
  audit.autoFilter = { from: 'A5', to: `H${lastRow}` };
  audit.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export { MIME_TYPE as AUDIT_REPORT_MIME_TYPE };
