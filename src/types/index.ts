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
  productId: number | null;  // Nullable - becomes null when product is deleted (history preserved)
  productName?: string; // Product name fetched from JOIN - avoids "Unknown Product" issue
  action: 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated';
  quantity: number;
  notes: string;
  timestamp: string;
  // Contact person - label changes based on action: "Received By" for stock_in, "Issued To" for stock_out
  contactPerson?: string;
  pricePerUnit?: number;
  date?: string;
  unitOfMeasure?: string; // Unit of measure stored for audit trail
}

export type HistoryActionFilter = 'all' | 'stock_in' | 'stock_out';
export type HistoryDateRangeFilter = 'all' | 'today' | 'yesterday' | 'weekly' | 'current_month' | 'previous_month' | '3_months' | 'custom';

export interface HistoryFilters {
  action: HistoryActionFilter;
  dateRange: HistoryDateRangeFilter;
  searchTerm: string;
}

export type ProductType = 'inventory' | 'gym';
export type TabType = 'dashboard' | 'products' | 'history' | 'settings';

export interface GymMember {
  id: number;
  memberCode: string;
  name: string;
  phone: string;
  membershipType: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface GymMemberFormData {
  name: string;
  phone: string;
  membershipType: string;
  status: 'active' | 'inactive';
}

export interface GymCheckin {
  id: number;
  memberId: number | null;
  memberName: string;
  memberCode: string;
  checkInTime: string;
  checkOutTime: string | null;
}

export type GymScanAction = 'checked_in' | 'checked_out';

export interface GymScanResult {
  success: boolean;
  action: GymScanAction;
  memberId: number;
  memberName: string;
  memberCode: string;
  timestamp: string;
}

export type GymRole = 'gym_admin' | 'gym_staff';

export interface GymRoleEntry {
  userId: string;
  email: string;
  role: GymRole;
  createdAt: string;
}

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
