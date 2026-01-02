import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, Download, Upload, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Product, Category, Location, ProductFormData } from '../../types';
import { getCategoryName, getLocationName } from '../../utils/helpers';
import { ProductFilters } from './ProductFilters';
import { exportToCSV } from '../../utils/exportData';
import { importFromCSV } from '../../utils/importData';
import { useAdmin } from '../../hooks/useAdmin';

interface ProductsListProps {
  products: Product[];
  categories: Category[];
  locations: Location[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: number) => void;
  onStockAdjust: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  onProductAdd?: (product: ProductFormData, skipReload?: boolean) => Promise<void>;
  onReloadProducts?: () => Promise<void>;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onFilterChange?: (filters: { searchTerm: string; categoryId: string }) => void;
}

type ColumnKey = 'sku' | 'brand' | 'category' | 'location' | 'quantity' | 'price';

interface ColumnVisibility {
  sku: boolean;
  brand: boolean;
  category: boolean;
  location: boolean;
  quantity: boolean;
  price: boolean;
}

const defaultColumnVisibility: ColumnVisibility = {
  sku: false,  // Hidden by default
  brand: true,
  category: true,
  location: true,
  quantity: true,
  price: true,
};

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  categories,
  locations,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onStockAdjust,
  onViewProduct,
  onProductAdd,
  onReloadProducts,
  currentPage = 0,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  onFilterChange,
}) => {
  const [filters, setFilters] = useState({ searchTerm: '', categoryId: '' });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(defaultColumnVisibility);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Load column visibility from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('productColumnsVisibility');
    if (saved) {
      try {
        setColumnVisibility(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved column visibility', e);
      }
    }
  }, []);

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('productColumnsVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnSelector]);

  const handleFilterChange = (newFilters: { searchTerm: string; categoryId: string }) => {
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const handleExport = async () => {
    await exportToCSV(categories, locations);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onProductAdd) return;

    setImportError(null);
    setImportSuccess(null);

    try {
      const result = await importFromCSV(file, categories, locations, onProductAdd);

      // Reload products after import completes
      if (result.imported > 0 && onReloadProducts) {
        await onReloadProducts();
      }

      if (result.success) {
        setImportSuccess(`Successfully imported ${result.imported} products`);
      } else {
        setImportError(`Import completed with errors. Imported: ${result.imported}. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      setImportError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const toggleColumn = (column: ColumnKey) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const columnLabels: Record<ColumnKey, string> = {
    sku: 'SKU',
    brand: 'Brand',
    category: 'Category',
    location: 'Location',
    quantity: 'Quantity',
    price: 'Price',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex gap-2">
          {/* Column Selector Dropdown */}
          <div className="relative" ref={columnSelectorRef}>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center gap-2"
              title="Select columns to display"
            >
              <Settings className="w-4 h-4" />
              Columns
            </button>
            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <div className="text-sm font-medium text-gray-700 px-2 py-1 border-b">
                    Show/Hide Columns
                  </div>
                  {(Object.keys(columnLabels) as ColumnKey[]).map((column) => (
                    <label
                      key={column}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 cursor-pointer rounded"
                    >
                      <input
                        type="checkbox"
                        checked={columnVisibility[column]}
                        onChange={() => toggleColumn(column)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{columnLabels[column]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
            title="Export all products to CSV"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {!adminLoading && isAdmin && (
            <>
              <button
                onClick={handleImportClick}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
                title="Import products from CSV"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </>
          )}
          <button
            onClick={onAddProduct}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {importError}
        </div>
      )}

      {importSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {importSuccess}
        </div>
      )}

      <ProductFilters
        categories={categories}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="bg-white border rounded-lg overflow-hidden">
        {products.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            Showing {products.length} {filters.categoryId || filters.searchTerm ? 'filtered' : ''} products
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
              {columnVisibility.sku && <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>}
              {columnVisibility.brand && <th className="px-4 py-3 text-left text-sm font-medium">Brand</th>}
              {columnVisibility.category && <th className="px-4 py-3 text-left text-sm font-medium">Category</th>}
              {columnVisibility.location && <th className="px-4 py-3 text-left text-sm font-medium">Location</th>}
              {columnVisibility.quantity && <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>}
              {columnVisibility.price && <th className="px-4 py-3 text-right text-sm font-medium">Price</th>}
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr
                key={product.id}
                className={product.minStock > 0 && product.quantity <= product.minStock ? 'bg-red-50' : ''}
              >
                <td className="px-4 py-3">
                  <div>
                    <button
                      onClick={() => onViewProduct?.(product)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {product.name}
                    </button>
                    {product.specification && (
                      <p className="text-xs text-gray-500">{product.specification}</p>
                    )}
                    {product.minStock > 0 && product.quantity <= product.minStock && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </span>
                    )}
                  </div>
                </td>
                {columnVisibility.sku && <td className="px-4 py-3 text-sm">{product.sku}</td>}
                {columnVisibility.brand && <td className="px-4 py-3 text-sm">{product.brand || '-'}</td>}
                {columnVisibility.category && (
                  <td className="px-4 py-3 text-sm">
                    {getCategoryName(categories, product.categoryId)}
                  </td>
                )}
                {columnVisibility.location && (
                  <td className="px-4 py-3 text-sm">
                    {getLocationName(locations, product.locationId)}
                  </td>
                )}
                {columnVisibility.quantity && (
                  <td className="px-4 py-3 text-right font-medium">
                    {product.quantity} {product.unitOfMeasure || 'pcs'}
                  </td>
                )}
                {columnVisibility.price && <td className="px-4 py-3 text-right">₹{product.price.toFixed(2)}</td>}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onStockAdjust(product)}
                    className="text-purple-600 hover:text-purple-800 p-1"
                    title="Adjust Stock"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditProduct(product)}
                    className="text-blue-600 hover:text-blue-800 p-1 ml-2"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this product?')) {
                        onDeleteProduct(product.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-800 p-1 ml-2"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (filters.categoryId || filters.searchTerm) && (
          <div className="text-center py-12 text-gray-500">
            No products match your filters. Try adjusting your search criteria.
          </div>
        )}
        {products.length === 0 && !filters.categoryId && !filters.searchTerm && (
          <div className="text-center py-12 text-gray-500">
            No products yet. Click "Add Product" to get started.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {currentPage * 50 + 1} to {Math.min((currentPage + 1) * 50, totalCount)} of {totalCount} products
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className={`px-3 py-1 rounded flex items-center gap-1 ${
                currentPage === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border hover:bg-gray-50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className={`px-3 py-1 rounded flex items-center gap-1 ${
                currentPage >= totalPages - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
