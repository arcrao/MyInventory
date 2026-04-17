import { useState, useEffect } from 'react';
import { Product, ProductFormData } from '../types';
import { StorageService } from '../services/storage.service';
import { User } from '@supabase/supabase-js';

interface StockAdjustmentData {
  quantity: number;
  notes: string;
  contactPerson?: string;
  pricePerUnit?: number;
  date: string;
}

export const useProducts = (user: User | null) => {
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
    loadProducts(0, newFilters);
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addProduct = async (productData: ProductFormData, skipReload: boolean = false): Promise<void> => {
    // Use atomic RPC transaction (single database call)
    // Both product insert and history insert happen in one transaction
    await StorageService.addProductWithHistory(productData);

    // Reload products to reflect changes (skip for bulk import)
    if (!skipReload) {
      await loadProducts();
    }
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    // Use atomic RPC transaction (single database call)
    // Both product update and history insert happen in one transaction
    // The RPC function handles change tracking and history notes
    await StorageService.updateProductWithHistory(updatedProduct.id, updatedProduct);

    // Reload products to reflect changes
    await loadProducts();
  };

  const stockIn = async (productId: number, data: StockAdjustmentData): Promise<void> => {
    // Use atomic RPC transaction (single database call)
    // Both product update and history insert happen in one transaction
    await StorageService.stockInProduct(
      productId,
      data.quantity,
      data.notes || 'Stock added',
      data.contactPerson,
      data.pricePerUnit,
      data.date
    );
    // Reload products to reflect changes
    await loadProducts();
  };

  const stockOut = async (productId: number, data: StockAdjustmentData): Promise<void> => {
    // Use atomic RPC transaction (single database call)
    // Both product update and history insert happen in one transaction
    await StorageService.stockOutProduct(
      productId,
      data.quantity,
      data.notes || 'Stock removed',
      data.contactPerson,
      data.pricePerUnit,
      data.date
    );
    // Reload products to reflect changes
    await loadProducts();
  };

  const deleteProduct = async (id: number): Promise<void> => {
    // Use atomic RPC transaction (single database call)
    // History entry is created BEFORE product deletion in one transaction
    // This ensures audit trail is preserved even if product is deleted
    await StorageService.deleteProductWithHistory(id);

    // Reload products to reflect changes
    await loadProducts();
  };

  const goToPage = (page: number) => {
    loadProducts(page);
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
