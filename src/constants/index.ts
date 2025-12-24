export const STORAGE_KEYS = {
  PRODUCTS: 'inventory-products',
  CATEGORIES: 'inventory-categories',
  LOCATIONS: 'inventory-locations',
  HISTORY: 'inventory-history',
} as const;

export const UNITS_OF_MEASURE = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'lbs', label: 'Pounds (lbs)' },
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
