import { parseCSV } from './importData';
import { StorageService } from '../services/storage.service';
import {
  FireExtinguisherImportResult,
  FireExtinguisherImportFileResult,
  FireExtinguisherImportRow,
} from '../types';

/**
 * Fire extinguisher sheet import.
 *
 * Multi-sheet support without a spreadsheet dependency: in Excel, Save As CSV
 * once per sheet, then select every resulting .csv at once. Each file is parsed
 * independently and its name is recorded as the row's source sheet.
 *
 * Reuses parseCSV from ./importData verbatim - that parser is shared with the
 * product importer, so it must not be modified here.
 */

/** Field names on the parsed row, matching the bulk upsert RPC's payload keys. */
type FieldName =
  | 'area'
  | 'location'
  | 'extinguisher_no'
  | 'type'
  | 'capacity'
  | 'pressure'
  | 'inspection_tag'
  | 'safety_pin'
  | 'refilled_date'
  | 'refilling_due_date'
  | 'remarks';

/**
 * Header aliases. Mapping is by HEADER NAME, not column position.
 *
 * The product importer discards its header row and destructures by array index,
 * which is why its own export cannot be re-imported. Real registers also vary
 * in column order and carry a SL.NO column that is not data - and in the sample
 * that column runs 1, 2, 19, so a positional parser would happily read 19 as an
 * extinguisher number.
 */
const HEADER_ALIASES: Record<string, FieldName> = {
  AREA: 'area',
  BLOCK: 'area',
  LOCATION: 'location',
  FLOOR: 'location',
  'EXTINGUISHER NO': 'extinguisher_no',
  'EXTINGUISHER NUMBER': 'extinguisher_no',
  'EXT NO': 'extinguisher_no',
  'EXTINGUISHER NO.': 'extinguisher_no',
  TYPE: 'type',
  CAPACITY: 'capacity',
  PRESSURE: 'pressure',
  'INSPECTION TAG': 'inspection_tag',
  INSPECTION: 'inspection_tag',
  'SAFETY PIN': 'safety_pin',
  'REFILLED DATE': 'refilled_date',
  'REFILL DATE': 'refilled_date',
  'REFILLING DUE DATE': 'refilling_due_date',
  'DUE DATE': 'refilling_due_date',
  'NEXT REFILL DATE': 'refilling_due_date',
  REMARKS: 'remarks',
  REMARK: 'remarks',
};

/** Columns that are legitimately present but carry no data. */
const IGNORED_HEADERS = new Set(['SL.NO', 'SL NO', 'S.NO', 'SNO', 'SR.NO', 'SR NO', 'UNIQUE ID', 'SOURCE SHEET', '']);

/**
 * trim -> collapse internal whitespace -> uppercase.
 *
 * This is what makes the sample's 'REFILLING DUE  DATE' (double space) and
 * 'EXTINGUISHER NO ' (trailing space) resolve to known headers.
 */
const normaliseHeader = (header: string): string =>
  header.replace(/\s+/g, ' ').trim().toUpperCase();

/**
 * Normalised composite key: AREA|LOCATION|EXTINGUISHER NO.
 *
 * Must stay identical to the SQL expression behind the unique_key generated
 * column in migration_add_fire_extinguishers.sql, otherwise the client would
 * dedupe a batch differently from how the database resolves conflicts.
 */
export const buildExtinguisherKey = (
  area: string,
  location: string,
  extinguisherNo: string
): string => {
  const part = (value: string) => value.replace(/\s+/g, ' ').trim().toUpperCase();
  return `${part(area)}|${part(location)}|${part(extinguisherNo)}`;
};

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const toISO = (year: number, month: number, day: number): string | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Rejects impossible dates that JS would otherwise roll over (e.g. 31 Feb)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Parse a sheet date to yyyy-mm-dd, or null if unparseable.
 *
 * Slash-separated dates are read MONTH-FIRST. The sample's '5/1/2026' pairs
 * with the remark "REFILLING RECEIVED IN 01 MAY 2026", confirming M/D/YYYY.
 *
 * Excel serial numbers are not handled because they cannot occur here: CSV
 * export writes formatted date text, not serials.
 */
export const parseSheetDate = (value: string): string | null => {
  const raw = (value || '').trim();
  if (!raw) return null;

  // yyyy-mm-dd
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return toISO(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // M/D/YYYY, M-D-YYYY, M/D/YY
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) {
      year += year < 70 ? 2000 : 1900;
    }
    return toISO(year, month, day);
  }

  // D-MMM-YYYY / D MMM YYYY (e.g. 01-MAY-2026)
  const named = raw.match(/^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{2}|\d{4})$/);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toUpperCase()];
    if (!month) return null;
    let year = Number(named[3]);
    if (year < 100) {
      year += year < 70 ? 2000 : 1900;
    }
    return toISO(year, month, Number(named[1]));
  }

  return null;
};

/** Cap text so a malformed sheet cannot write unbounded strings. */
const MAX_FIELD_LENGTH = 500;
const capped = (value: string | undefined): string =>
  (value || '').trim().slice(0, MAX_FIELD_LENGTH);

const fileLabel = (fileName: string): string => fileName.replace(/\.[^.]+$/, '');

interface ParsedFile {
  rows: FireExtinguisherImportRow[];
  errors: string[];
  warnings: string[];
}

const parseOneFile = (fileName: string, text: string): ParsedFile => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: FireExtinguisherImportRow[] = [];

  const grid = parseCSV(text);

  if (grid.length === 0) {
    errors.push(`${fileName}: file is empty`);
    return { rows, errors, warnings };
  }

  // Locate the header row rather than assuming row 0 - real sheets often carry
  // a title or banner above the table.
  let headerIndex = -1;
  const searchDepth = Math.min(10, grid.length);
  for (let i = 0; i < searchDepth; i++) {
    const normalised = grid[i].map(normaliseHeader);
    if (normalised.includes('AREA') && normalised.includes('LOCATION')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    errors.push(
      `${fileName}: could not find a header row containing AREA and LOCATION in the first ${searchDepth} rows`
    );
    return { rows, errors, warnings };
  }

  const headers = grid[headerIndex].map(normaliseHeader);
  const columnMap = new Map<number, FieldName>();
  const unknown: string[] = [];

  headers.forEach((header, index) => {
    const field = HEADER_ALIASES[header];
    if (field) {
      columnMap.set(index, field);
    } else if (!IGNORED_HEADERS.has(header)) {
      unknown.push(header);
    }
  });

  if (unknown.length > 0) {
    warnings.push(`${fileName}: ignored unrecognised column(s): ${unknown.join(', ')}`);
  }

  const mapped = new Set(columnMap.values());
  const missing = (['area', 'location', 'extinguisher_no'] as FieldName[]).filter(
    field => !mapped.has(field)
  );
  if (missing.length > 0) {
    errors.push(
      `${fileName}: missing required column(s): ${missing
        .map(field => field.replace(/_/g, ' ').toUpperCase())
        .join(', ')}`
    );
    return { rows, errors, warnings };
  }

  const sourceSheet = fileLabel(fileName);

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const line = grid[i];
    const rowNumber = i + 1; // 1-indexed, matching what the user sees in Excel

    const values: Partial<Record<FieldName, string>> = {};
    columnMap.forEach((field, columnIndex) => {
      values[field] = line[columnIndex] ?? '';
    });

    const area = capped(values.area);
    const location = capped(values.location);
    const extinguisherNo = capped(values.extinguisher_no);

    // A trailing blank line is not an error worth reporting
    if (!area && !location && !extinguisherNo) {
      continue;
    }

    if (!area || !location || !extinguisherNo) {
      errors.push(
        `${fileName} row ${rowNumber}: AREA, LOCATION and EXTINGUISHER NO are required`
      );
      continue;
    }

    const refilledRaw = (values.refilled_date || '').trim();
    const dueRaw = (values.refilling_due_date || '').trim();
    const refilledDate = parseSheetDate(refilledRaw);
    const refillingDueDate = parseSheetDate(dueRaw);

    // An unreadable date is a warning, not a rejection - the rest of the row is
    // still worth having.
    if (refilledRaw && !refilledDate) {
      warnings.push(`${fileName} row ${rowNumber}: could not read REFILLED DATE "${refilledRaw}"`);
    }
    if (dueRaw && !refillingDueDate) {
      warnings.push(
        `${fileName} row ${rowNumber}: could not read REFILLING DUE DATE "${dueRaw}"`
      );
    }

    rows.push({
      area,
      location,
      extinguisher_no: extinguisherNo,
      type: capped(values.type),
      capacity: capped(values.capacity),
      pressure: capped(values.pressure),
      inspection_tag: capped(values.inspection_tag),
      safety_pin: capped(values.safety_pin),
      refilled_date: refilledDate,
      refilling_due_date: refillingDueDate,
      remarks: capped(values.remarks),
      source_sheet: sourceSheet,
    });
  }

  return { rows, errors, warnings };
};

/**
 * Parse every selected CSV and upsert the combined result.
 *
 * A bad sheet never aborts the good ones: each file is parsed independently and
 * reported on separately.
 */
export const importFireExtinguishersFromFiles = async (
  files: File[]
): Promise<FireExtinguisherImportResult> => {
  const result: FireExtinguisherImportResult = {
    success: true,
    totalInserted: 0,
    totalUpdated: 0,
    files: [],
    errors: [],
    warnings: [],
  };

  if (files.length === 0) {
    result.success = false;
    result.errors.push('No files selected');
    return result;
  }

  // key -> { row, fileName }, so a duplicate within one upload resolves before
  // it reaches the database (last occurrence wins, same as the DB's upsert)
  const byKey = new Map<string, { row: FireExtinguisherImportRow; fileName: string }>();
  const perFile = new Map<string, FireExtinguisherImportFileResult>();

  for (const file of files) {
    const fileResult: FireExtinguisherImportFileResult = {
      fileName: file.name,
      parsed: 0,
      skipped: 0,
    };
    perFile.set(file.name, fileResult);

    let text: string;
    try {
      text = await file.text();
    } catch (error) {
      result.errors.push(
        `${file.name}: could not read file - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      continue;
    }

    const parsed = parseOneFile(file.name, text);
    result.errors.push(...parsed.errors);
    result.warnings.push(...parsed.warnings);
    fileResult.parsed = parsed.rows.length;
    fileResult.skipped = parsed.errors.length;

    for (const row of parsed.rows) {
      const key = buildExtinguisherKey(row.area, row.location, row.extinguisher_no);
      const existing = byKey.get(key);
      if (existing) {
        result.warnings.push(
          `Duplicate key ${key} in this upload (${existing.fileName} then ${file.name}) - kept the later row`
        );
        const previous = perFile.get(existing.fileName);
        if (previous) previous.parsed -= 1;
      }
      byKey.set(key, { row, fileName: file.name });
    }
  }

  const rows = Array.from(byKey.values()).map(entry => entry.row);

  if (rows.length > 0) {
    try {
      const upsert = await StorageService.bulkUpsertFireExtinguishers(rows);
      result.totalInserted = upsert.inserted;
      result.totalUpdated = upsert.updated;
      result.errors.push(...upsert.errors);
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.files = Array.from(perFile.values());
      return result;
    }
  }

  result.files = Array.from(perFile.values());

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
};
