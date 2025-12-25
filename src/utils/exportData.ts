import { Product, Category, Location } from '../types';

export const exportToCSV = (
  products: Product[],
  categories: Category[],
  locations: Location[]
) => {
  // Create CSV header
  const headers = [
    'Name',
    'SKU',
    'Quantity',
    'Min Stock',
    'Price',
    'Category',
    'Location',
    'Description',
    'Brand',
    'Specification',
    'Unit of Measure'
  ];

  // Create category and location maps for lookup
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  const locationMap = new Map(locations.map(l => [l.id, l.name]));

  // Create CSV rows
  const rows = products.map(product => [
    escapeCSV(product.name),
    escapeCSV(product.sku),
    product.quantity,
    product.minStock,
    product.price,
    escapeCSV(categoryMap.get(product.categoryId) || ''),
    escapeCSV(locationMap.get(product.locationId) || ''),
    escapeCSV(product.description),
    escapeCSV(product.brand),
    escapeCSV(product.specification),
    escapeCSV(product.unitOfMeasure)
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to escape CSV fields
const escapeCSV = (value: string): string => {
  if (!value) return '';

  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};
