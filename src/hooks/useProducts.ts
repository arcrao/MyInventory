import { useState, useEffect } from 'react';
import { Product, ProductFormData, HistoryEntry } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

interface StockAdjustmentData {
  quantity: number;
  notes: string;
  contactPerson?: string;
  pricePerUnit?: number;
  date: string;
}

export const useProducts = (
  onHistoryAdd: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>,
  user: User | null
) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ searchTerm: '', categoryId: '' });
  const pageSize = 50;

  const loadProducts = async (page?: number, newFilters?: { searchTerm: string; categoryId: string }) => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const pageToLoad = page !== undefined ? page : currentPage;
      const filtersToUse = newFilters || filters;

      const [data, count] = await Promise.all([
        StorageService.getProducts(
          pageToLoad,
          pageSize,
          filtersToUse.categoryId || undefined,
          filtersToUse.searchTerm || undefined
        ),
        StorageService.getProductsCount(
          filtersToUse.categoryId || undefined,
          filtersToUse.searchTerm || undefined
        )
      ]);
      setProducts(data);
      setTotalCount(count);
      if (page !== undefined) {
        setCurrentPage(page);
      }
      if (newFilters) {
        setFilters(newFilters);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (newFilters: { searchTerm: string; categoryId: string }) => {
    setCurrentPage(0); // Reset to first page
    loadProducts(0, newFilters);
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage]);

  const addProduct = async (productData: ProductFormData, skipReload: boolean = false): Promise<void> => {
    const newProduct = await StorageService.addProduct(productData);
    if (newProduct) {
      await onHistoryAdd({
        productId: newProduct.id,
        action: 'created',
        quantity: productData.quantity,
        notes: 'Product created',
      });
      // Reload products to reflect changes (skip for bulk import)
      if (!skipReload) {
        await loadProducts();
      }
    }
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    await StorageService.updateProduct(updatedProduct.id, updatedProduct);
    await onHistoryAdd({
      productId: updatedProduct.id,
      action: 'updated',
      quantity: 0,
      notes: 'Product details updated',
    });
    // Reload products to reflect changes
    await loadProducts();
  };

  const stockIn = async (productId: number, data: StockAdjustmentData): Promise<void> => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = { ...product, quantity: product.quantity + data.quantity };
    await StorageService.updateProduct(productId, { quantity: updatedProduct.quantity });
    await onHistoryAdd({
      productId,
      action: 'stock_in',
      quantity: data.quantity,
      notes: data.notes || 'Stock added',
      contactPerson: data.contactPerson,
      pricePerUnit: data.pricePerUnit,
      date: data.date,
    });
    // Reload products to reflect changes
    await loadProducts();
  };

  const stockOut = async (productId: number, data: StockAdjustmentData): Promise<void> => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = { ...product, quantity: product.quantity - data.quantity };
    await StorageService.updateProduct(productId, { quantity: updatedProduct.quantity });
    await onHistoryAdd({
      productId,
      action: 'stock_out',
      quantity: data.quantity,
      notes: data.notes || 'Stock removed',
      contactPerson: data.contactPerson,
      date: data.date,
    });
    // Reload products to reflect changes
    await loadProducts();
  };

  const deleteProduct = async (id: number): Promise<void> => {
    await StorageService.deleteProduct(id);
    await onHistoryAdd({
      productId: id,
      action: 'deleted',
      quantity: 0,
      notes: 'Product deleted',
    });
    // Reload products to reflect changes
    await loadProducts();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    products,
    addProduct,
    updateProduct,
    stockIn,
    stockOut,
    deleteProduct,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    pageSize,
    loading,
    filters,
    applyFilters,
    reloadProducts: loadProducts,
  };
};
