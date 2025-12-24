import { useState, useEffect } from 'react';
import { Product, ProductFormData } from '../types';
import { StorageService } from '../services/storage.service';

export const useProducts = (onHistoryAdd: (
  productId: number,
  action: 'created' | 'stock_in' | 'stock_out' | 'deleted' | 'updated',
  quantity: number,
  notes?: string
) => Promise<void>) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await StorageService.getProducts();
    setProducts(data);
  };

  const addProduct = async (productData: ProductFormData): Promise<void> => {
    const newProduct: Product = {
      ...productData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    const newProducts = [...products, newProduct];
    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd(newProduct.id, 'created', productData.quantity, 'Product created');
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    const newProducts = products.map(p =>
      p.id === updatedProduct.id ? updatedProduct : p
    );
    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd(updatedProduct.id, 'updated', 0, 'Product details updated');
  };

  const stockIn = async (productId: number, quantity: number, notes: string): Promise<void> => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = { ...product, quantity: product.quantity + quantity };
    const newProducts = products.map(p => p.id === productId ? updatedProduct : p);

    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd(productId, 'stock_in', quantity, notes || 'Stock added');
  };

  const stockOut = async (productId: number, quantity: number, notes: string): Promise<void> => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = { ...product, quantity: product.quantity - quantity };
    const newProducts = products.map(p => p.id === productId ? updatedProduct : p);

    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd(productId, 'stock_out', quantity, notes || 'Stock removed');
  };

  const deleteProduct = async (id: number): Promise<void> => {
    const newProducts = products.filter(p => p.id !== id);
    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd(id, 'deleted', 0, 'Product deleted');
  };

  return {
    products,
    addProduct,
    updateProduct,
    stockIn,
    stockOut,
    deleteProduct,
  };
};
