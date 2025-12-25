import { Product, Category, Location } from '../types';
import { StorageService } from '../services/storage.service';

export const exportToCSV = async (
  categories: Category[],
  locations: Location[]
): Promise<void> => {
  try {
    // Fetch ALL products from Supabase (no pagination)
    const allProducts = await StorageService.getProducts();

    if (allProducts.length === 0) {
      alert('No products to export');
      return;
    }

    // Create category and location maps for lookup
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const locationMap = new Map(locations.map(l => [l.id, l.name]));

    // Group products by category
    const productsByCategory = new Map<string, Product[]>();

    allProducts.forEach(product => {
      const categoryName = categoryMap.get(product.categoryId) || 'Uncategorized';
      if (!productsByCategory.has(categoryName)) {
        productsByCategory.set(categoryName, []);
      }
      productsByCategory.get(categoryName)!.push(product);
    });

    // Sort categories alphabetically, but keep "Uncategorized" at the end
    const sortedCategories = Array.from(productsByCategory.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    // Create CSV content with category grouping
    const csvLines: string[] = [];

    // Add headers
    const headers = [
      'Category',
      'Name',
      'SKU',
      'Quantity',
      'Min Stock',
      'Price',
      'Location',
      'Description',
      'Brand',
      'Specification',
      'Unit of Measure'
    ];
    csvLines.push(headers.join(','));

    // Add products grouped by category
    sortedCategories.forEach(categoryName => {
      const products = productsByCategory.get(categoryName)!;

      products.forEach(product => {
        const row = [
          escapeCSV(categoryName),
          escapeCSV(product.name),
          escapeCSV(product.sku),
          product.quantity,
          product.minStock,
          product.price,
          escapeCSV(locationMap.get(product.locationId) || ''),
          escapeCSV(product.description),
          escapeCSV(product.brand),
          escapeCSV(product.specification),
          escapeCSV(product.unitOfMeasure)
        ];
        csvLines.push(row.join(','));
      });
    });

    // Create and download file
    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data. Please try again.');
  }
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
