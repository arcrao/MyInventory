import { useState, useEffect } from 'react';
import { Product, ProductFormData, HistoryEntry } from '../types';
import { StorageService } from '../services/storage.service';

interface StockAdjustmentData {
  quantity: number;
  notes: string;
  receivedBy?: string;
  pricePerUnit?: number;
  issuedTo?: string;
  date: string;
}

export const useProducts = (onHistoryAdd: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>) => {
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
    await onHistoryAdd({
      productId: newProduct.id,
      action: 'created',
      quantity: productData.quantity,
      notes: 'Product created',
    });
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    const newProducts = products.map(p =>
      p.id === updatedProduct.id ? updatedProduct : p
    );
    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd({
      productId: updatedProduct.id,
      action: 'updated',
      quantity: 0,
      notes: 'Product details updated',
    });
  };

  const stockIn = async (productId: number, data: StockAdjustmentData): Promise<void> => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = { ...product, quantity: product.quantity + data.quantity };
    const newProducts = products.map(p => p.id === productId ? updatedProduct : p);

    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd({
      productId,
      action: 'stock_in',
      quantity: data.quantity,
      notes: data.notes || 'Stock added',
      receivedBy: data.receivedBy,
      pricePerUnit: data.pricePerUnit,
      date: data.date,
    });
  };

  const stockOut = async (productId: number, data: StockAdjustmentData): Promise<void> => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = { ...product, quantity: product.quantity - data.quantity };
    const newProducts = products.map(p => p.id === productId ? updatedProduct : p);

    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd({
      productId,
      action: 'stock_out',
      quantity: data.quantity,
      notes: data.notes || 'Stock removed',
      issuedTo: data.issuedTo,
      date: data.date,
    });
  };

  const deleteProduct = async (id: number): Promise<void> => {
    const newProducts = products.filter(p => p.id !== id);
    setProducts(newProducts);
    await StorageService.setProducts(newProducts);
    await onHistoryAdd({
      productId: id,
      action: 'deleted',
      quantity: 0,
      notes: 'Product deleted',
    });
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
