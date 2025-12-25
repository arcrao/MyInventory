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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    loadProducts();
  }, [currentPage]);

  const loadProducts = async (page?: number) => {
    const pageToLoad = page !== undefined ? page : currentPage;
    const [data, count] = await Promise.all([
      StorageService.getProducts(pageToLoad, pageSize),
      StorageService.getProductsCount()
    ]);
    setProducts(data);
    setTotalCount(count);
    if (page !== undefined) {
      setCurrentPage(page);
    }
  };

  const addProduct = async (productData: ProductFormData): Promise<void> => {
    const newProduct = await StorageService.addProduct(productData);
    if (newProduct) {
      await onHistoryAdd({
        productId: newProduct.id,
        action: 'created',
        quantity: productData.quantity,
        notes: 'Product created',
      });
      // Reload products to reflect changes
      await loadProducts();
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
      receivedBy: data.receivedBy,
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
      issuedTo: data.issuedTo,
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
  };
};
