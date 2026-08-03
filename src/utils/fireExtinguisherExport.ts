import { FireExtinguisher } from '../types';
import { downloadCSV } from './csvExport';

/**
 * Fire extinguisher CSV export.
 *
 * Round-trippable by construction: the headers are exactly the ones the
 * importer accepts, in the order it documents. SL.NO, UNIQUE ID and SOURCE
 * SHEET are extra context columns that the importer ignores or re-derives, so
 * an exported file can be edited and re-imported without data drift.
 *
 * Reuses downloadCSV from ./csvExport (it correctly revokes the object URL).
 * The field escaping below is deliberately local rather than shared with
 * csvExport's private escapeCSVField - see the note on formula injection.
 */

const EXPORT_HEADERS = [
  'SL.NO',
  'AREA',
  'LOCATION',
  'EXTINGUISHER NO',
  'TYPE',
  'CAPACITY',
  'PRESSURE',
  'INSPECTION TAG',
  'SAFETY PIN',
  'REFILLED DATE',
  'REFILLING DUE DATE',
  'REMARKS',
  'UNIQUE ID',
  'SOURCE SHEET',
];

/**
 * Neutralise spreadsheet formula injection.
 *
 * A cell beginning = + - or @ is executed as a formula when the file is opened
 * in Excel. That matters here specifically because this data originates in
 * user-editable spreadsheets and is exported straight back into one. Prefixing
 * with an apostrophe makes Excel treat it as text.
 *
 * This lives here rather than in csvExport's shared escapeCSVField on purpose:
 * changing that helper would alter product and history export output too.
 */
const neutraliseFormula = (field: string): string =>
  /^[=+\-@]/.test(field) ? `'${field}` : field;

const escapeField = (field: string): string => {
  const safe = neutraliseFormula(field ?? '');
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

/** Render yyyy-mm-dd back to the M/D/YYYY form the source register uses. */
const toSheetDate = (isoDate: string | null): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${month}/${day}/${year}`;
};

export const exportFireExtinguishersToCSV = (extinguishers: FireExtinguisher[]): string => {
  const rows = extinguishers.map((item, index) => [
    String(index + 1),
    item.area,
    item.location,
    item.extinguisherNo,
    item.type,
    item.capacity,
    item.pressure,
    item.inspectionTag,
    item.safetyPin,
    toSheetDate(item.refilledDate),
    toSheetDate(item.refillingDueDate),
    item.remarks,
    item.uniqueKey,
    item.sourceSheet,
  ]);

  return [
    EXPORT_HEADERS.join(','),
    ...rows.map(row => row.map(escapeField).join(',')),
  ].join('\n');
};

export const downloadFireExtinguishersCSV = (extinguishers: FireExtinguisher[]): void => {
  const csv = exportFireExtinguishersToCSV(extinguishers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `fire-extinguishers-${timestamp}.csv`);
};
