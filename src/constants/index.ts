export const STORAGE_KEYS = {
  PRODUCTS: 'inventory-products',
  CATEGORIES: 'inventory-categories',
  LOCATIONS: 'inventory-locations',
  HISTORY: 'inventory-history',
} as const;

export const UNITS_OF_MEASURE = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'cans', label: 'Cans (cans)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'nos', label: "Numbers (No's)" },
  { value: 'l', label: 'Liters (l)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'carton', label: 'Carton' },
  { value: 'dozen', label: 'Dozen' },
] as const;

export const DEFAULT_PRODUCT_FORM_DATA = {
  name: '',
  sku: '',
  quantity: 0,
  minStock: 10,
  price: 0,
  categoryId: '',
  locationId: '',
  description: '',
  brand: '',
  specification: '',
  unitOfMeasure: 'pcs',
};

// ============================================================
// Fire Extinguishers
// ============================================================

/**
 * How many days ahead counts as "Expiring Soon".
 * Single source of truth: the status badge, the server-side status filter and
 * the summary card counts all derive from this, so they cannot disagree.
 */
export const DUE_SOON_DAYS = 30;

/** Suggestions only - the inputs stay free text so an unexpected value in an
 *  uploaded sheet is never rejected. */
export const EXTINGUISHER_TYPES = [
  'ABC',
  'CO2',
  'DCP',
  'FOAM',
  'WATER',
  'CLEAN AGENT',
  'K-TYPE',
] as const;

export const EXTINGUISHER_CAPACITIES = [
  '1KG',
  '2KG',
  '4KG',
  '5KG',
  '6KG',
  '9KG',
  '10KG',
  '2LTR',
  '6LTR',
  '9LTR',
] as const;

export const EXTINGUISHER_CONDITIONS = ['OK', 'NOT OK', 'MISSING'] as const;

export const DEFAULT_EXTINGUISHER_FORM_DATA = {
  area: '',
  location: '',
  extinguisherNo: '',
  type: 'ABC',
  capacity: '4KG',
  pressure: 'OK',
  inspectionTag: 'OK',
  safetyPin: 'OK',
  refilledDate: '',
  refillingDueDate: '',
  remarks: '',
};
