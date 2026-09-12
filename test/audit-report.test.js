import assert from 'node:assert/strict';
import test from 'node:test';

import ExcelJS from 'exceljs';

import {
  AUDIT_REPORT_MIME_TYPE,
  auditReportFilename,
  createAuditReportWorkbook,
} from '../src/audit-report.js';

test('audit workbook is readable, structured, and keeps untrusted text out of formulas', async () => {
  const generatedAt = new Date('2026-09-12T09:30:00.000Z');
  const buffer = await createAuditReportWorkbook({
    organizationName: 'MathCo',
    departmentName: 'Legal',
    timezone: 'Asia/Kolkata',
    generatedAt,
    activity: [{
      id: 41,
      emailId: 12,
      kind: 'completed',
      message: '=HYPERLINK("https://example.test", "Open")',
      createdAt: '2026-09-12T08:45:00.000Z',
      subject: '+Sensitive subject',
      actorName: 'Maya Shah',
      actorEmail: 'maya@mathco.test',
    }],
  });

  assert.equal(AUDIT_REPORT_MIME_TYPE, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(auditReportFilename('Legal & Compliance', generatedAt), 'lexflow-legal-compliance-audit-2026-09-12.xlsx');
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Summary', 'Audit log']);
  assert.equal(workbook.getWorksheet('Summary').getCell('B9').value, 1);
  const audit = workbook.getWorksheet('Audit log');
  assert.deepEqual(audit.getRow(5).values.slice(1, 9), [
    'Audit ID', 'Occurred at (UTC)', 'Event', 'Actor', 'Actor email', 'Email ID', 'Subject', 'Details',
  ]);
  assert.equal(audit.getCell('G6').value, "'+Sensitive subject");
  assert.equal(audit.getCell('H6').value, "'=HYPERLINK(\"https://example.test\", \"Open\")");
  assert.ok(audit.autoFilter);
});
