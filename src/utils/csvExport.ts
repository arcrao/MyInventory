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
