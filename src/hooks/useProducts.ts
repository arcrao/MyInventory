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
        productName: newProduct.name,  // Store product name for audit trail
        action: 'created',
        quantity: productData.quantity,
        notes: 'Product created',
        unitOfMeasure: newProduct.unitOfMeasure,  // Store unit of measure for audit trail
      });
      // Reload products to reflect changes (skip for bulk import)
      if (!skipReload) {
        await loadProducts();
      }
    }
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    // Find the old product to track what changed
    const oldProduct = products.find(p => p.id === updatedProduct.id);

    // Generate notes about what changed
    const changes: string[] = [];
    if (oldProduct) {
      if (oldProduct.name !== updatedProduct.name) changes.push(`Name: ${updatedProduct.name}`);
      if (oldProduct.price !== updatedProduct.price) changes.push(`Price: ₹${updatedProduct.price.toFixed(2)}`);
      if (oldProduct.minStock !== updatedProduct.minStock) changes.push(`Min Stock: ${updatedProduct.minStock}`);
      if (oldProduct.categoryId !== updatedProduct.categoryId) changes.push('Category updated');
      if (oldProduct.locationId !== updatedProduct.locationId) changes.push('Location updated');
      if (oldProduct.brand !== updatedProduct.brand) changes.push(`Brand: ${updatedProduct.brand}`);
      if (oldProduct.sku !== updatedProduct.sku) changes.push(`SKU: ${updatedProduct.sku}`);
    }

    const notes = changes.length > 0
      ? `Updated: ${changes.join(', ')}`
      : 'Product details updated';

    await StorageService.updateProduct(updatedProduct.id, updatedProduct);
    await onHistoryAdd({
      productId: updatedProduct.id,
      productName: updatedProduct.name,  // Store product name for audit trail
      action: 'updated',
      quantity: 0,
      notes: notes,
      pricePerUnit: updatedProduct.price,  // Store the new price in history
      unitOfMeasure: updatedProduct.unitOfMeasure,  // Store unit of measure for audit trail
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
      productName: product.name,  // Store product name for audit trail
      action: 'stock_in',
      quantity: data.quantity,
      notes: data.notes || 'Stock added',
      contactPerson: data.contactPerson,
      pricePerUnit: data.pricePerUnit,
      date: data.date,
      unitOfMeasure: product.unitOfMeasure,  // Store unit of measure for audit trail
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
      productName: product.name,  // Store product name for audit trail
      action: 'stock_out',
      quantity: data.quantity,
      notes: data.notes || 'Stock removed',
      contactPerson: data.contactPerson,
      date: data.date,
      unitOfMeasure: product.unitOfMeasure,  // Store unit of measure for audit trail
    });
    // Reload products to reflect changes
    await loadProducts();
  };

  const deleteProduct = async (id: number): Promise<void> => {
    // Find the product to get its name before deletion
    const product = products.find(p => p.id === id);
    const productName = product?.name || 'Unknown Product';

    // Add history entry BEFORE deleting the product (so foreign key constraint works)
    await onHistoryAdd({
      productId: id,
      productName: productName,  // Store product name for audit trail
      action: 'deleted',
      quantity: 0,
      notes: 'Product deleted',
      unitOfMeasure: product?.unitOfMeasure,  // Store unit of measure for audit trail
    });

    // Now delete the product (product_id in history will become NULL due to ON DELETE SET NULL)
    await StorageService.deleteProduct(id);

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
