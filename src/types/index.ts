export interface Product {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  price: number;
  categoryId: string;
  locationId: string;
  description: string;
  brand: string;
  specification: string;
  unitOfMeasure: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface HistoryEntry {
  id: number;
  productId: number;
  action: 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated';
  quantity: number;
  notes: string;
  timestamp: string;
  // Contact person - label changes based on action: "Received By" for stock_in, "Issued To" for stock_out
  contactPerson?: string;
  pricePerUnit?: number;
  date?: string;
}

export type TabType = 'dashboard' | 'products' | 'history' | 'settings';

export interface ProductFormData {
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  price: number;
  categoryId: string;
  locationId: string;
  description: string;
  brand: string;
  specification: string;
  unitOfMeasure: string;
}

export interface StorageItem {
  value: string;
}
