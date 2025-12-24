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
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    if (!oldProduct) return;

    const quantityDiff = updatedProduct.quantity - oldProduct.quantity;

    const newProducts = products.map(p =>
      p.id === updatedProduct.id ? updatedProduct : p
    );
    setProducts(newProducts);
    await StorageService.setProducts(newProducts);

    if (quantityDiff !== 0) {
      await onHistoryAdd(
        updatedProduct.id,
        quantityDiff > 0 ? 'stock_in' : 'stock_out',
        Math.abs(quantityDiff),
        'Stock updated'
      );
    }
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
    deleteProduct,
  };
};
