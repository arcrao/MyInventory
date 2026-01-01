import { HistoryEntry } from '../types';

/**
 * Export history entries to CSV format
 */
export const exportHistoryToCSV = (history: HistoryEntry[]): string => {
  // CSV Headers
  const headers = [
    'ID',
    'Timestamp',
    'Date',
    'Product ID',
    'Product Name',
    'Action',
    'Quantity',
    'Contact Person',
    'Price Per Unit',
    'Notes'
  ];

  // Convert entries to CSV rows
  const rows = history.map(entry => [
    entry.id.toString(),
    entry.timestamp,
    entry.date || '',
    entry.productId?.toString() || '',
    entry.productName || '',
    entry.action,
    entry.quantity.toString(),
    entry.contactPerson || '',
    entry.pricePerUnit?.toString() || '',
    escapeCSVField(entry.notes || '')
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string = 'history_backup.csv'): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
const escapeCSVField = (field: string): string => {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

/**
 * Parse CSV content and convert to HistoryEntry objects
 */
export const parseCSVToHistory = (csvContent: string): Omit<HistoryEntry, 'id' | 'timestamp'>[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Skip header row
  const dataLines = lines.slice(1);

  const entries: Omit<HistoryEntry, 'id' | 'timestamp'>[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const fields = parseCSVLine(line);

    if (fields.length < 10) {
      console.warn(`Skipping line ${i + 2}: insufficient fields`);
      continue;
    }

    try {
      const entry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
        productId: fields[3] ? parseInt(fields[3]) : null,
        productName: fields[4] || undefined,
        action: fields[5] as 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated',
        quantity: parseInt(fields[6]) || 0,
        notes: fields[9] || '',
        contactPerson: fields[7] || undefined,
        pricePerUnit: fields[8] ? parseFloat(fields[8]) : undefined,
        date: fields[2] || undefined,
      };

      // Validate action
      if (!['created', 'stock_in', 'stock_out', 'deleted', 'updated'].includes(entry.action)) {
        console.warn(`Skipping line ${i + 2}: invalid action "${fields[5]}"`);
        continue;
      }

      entries.push(entry);
    } catch (error) {
      console.warn(`Skipping line ${i + 2}: parse error`, error);
    }
  }

  return entries;
};

/**
 * Parse a single CSV line handling quoted fields
 */
const parseCSVLine = (line: string): string[] => {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(currentField);

  return fields;
};

/**
 * Read CSV file from file input
 */
export const readCSVFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};
