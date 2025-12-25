import { Category, Location, ProductFormData } from '../types';

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export const parseCSV = (csvText: string): string[][] => {
  const lines: string[][] = [];
  let currentField = '';
  let currentLine: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      currentField += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of line
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        if (currentLine.some(field => field.length > 0)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      }
      // Skip \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add last field and line if exists
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some(field => field.length > 0)) {
      lines.push(currentLine);
    }
  }

  return lines;
};

export const importFromCSV = async (
  file: File,
  categories: Category[],
  locations: Location[],
  onProductAdd: (product: ProductFormData, skipReload?: boolean) => Promise<void>
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    imported: 0,
    errors: []
  };

  try {
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      result.success = false;
      result.errors.push('CSV file is empty');
      return result;
    }

    // Skip header row
    const dataRows = rows.slice(1);

    // Create category and location maps for lookup
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const locationMap = new Map(locations.map(l => [l.name.toLowerCase(), l.id]));

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because we skip header and arrays are 0-indexed

      try {
        // Validate required fields
        if (row.length < 11) {
          result.errors.push(`Row ${rowNumber}: Insufficient columns`);
          continue;
        }

        const [name, sku, quantity, minStock, price, category, location, description, brand, specification, unitOfMeasure] = row;

        if (!name || !sku) {
          result.errors.push(`Row ${rowNumber}: Name and SKU are required`);
          continue;
        }

        // Find category and location IDs
        const categoryId = categoryMap.get(category.toLowerCase()) || '';
        const locationId = locationMap.get(location.toLowerCase()) || '';

        if (category && !categoryId) {
          result.errors.push(`Row ${rowNumber}: Category "${category}" not found`);
        }

        if (location && !locationId) {
          result.errors.push(`Row ${rowNumber}: Location "${location}" not found`);
        }

        const product: ProductFormData = {
          name: name.trim(),
          sku: sku.trim(),
          quantity: parseInt(quantity) || 0,
          minStock: parseInt(minStock) || 0,
          price: parseFloat(price) || 0,
          categoryId,
          locationId,
          description: description?.trim() || '',
          brand: brand?.trim() || '',
          specification: specification?.trim() || '',
          unitOfMeasure: unitOfMeasure?.trim() || 'pcs'
        };

        await onProductAdd(product, true); // skipReload=true during bulk import
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`File parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};
