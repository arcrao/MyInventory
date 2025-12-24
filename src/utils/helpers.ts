import { Product, Category, Location } from '../types';

export const getLowStockProducts = (products: Product[]): Product[] => {
  return products.filter(p => p.quantity <= p.minStock);
};

export const getTotalValue = (products: Product[]): number => {
  return products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
};

export const getTotalQuantity = (products: Product[]): number => {
  return products.reduce((sum, p) => sum + p.quantity, 0);
};

export const getCategoryName = (categories: Category[], id: string): string => {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.name : 'N/A';
};

export const getLocationName = (locations: Location[], id: string): string => {
  const loc = locations.find(l => l.id === id);
  return loc ? loc.name : 'N/A';
};

export const getProductName = (products: Product[], id: number): string => {
  const prod = products.find(p => p.id === id);
  return prod ? prod.name : 'Unknown Product';
};

export const getProductsByCategory = (products: Product[], categoryId: string): Product[] => {
  return products.filter(p => p.categoryId === categoryId);
};

export const getCategoryQuantity = (products: Product[], categoryId: string): number => {
  const catProducts = getProductsByCategory(products, categoryId);
  return catProducts.reduce((sum, p) => sum + p.quantity, 0);
};
