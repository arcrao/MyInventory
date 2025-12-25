import React, { useState, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
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
  onProductAdd?: (product: ProductFormData) => Promise<void>;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  categories,
  locations,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onStockAdjust,
  onProductAdd,
  currentPage = 0,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
}) => {
  const [filters, setFilters] = useState({ searchTerm: '', categoryId: '' });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin, loading: adminLoading } = useAdmin();

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Filter by search term (product name, SKU, or brand)
      const matchesSearch =
        !filters.searchTerm ||
        product.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Filter by category
      const matchesCategory = !filters.categoryId || product.categoryId === filters.categoryId;

      return matchesSearch && matchesCategory;
    });
  }, [products, filters]);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex gap-2">
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

      <ProductFilters categories={categories} onFilterChange={setFilters} />

      <div className="bg-white border rounded-lg overflow-hidden">
        {filteredProducts.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Brand</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Price</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className={product.quantity <= product.minStock ? 'bg-red-50' : ''}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.specification && (
                      <p className="text-xs text-gray-500">{product.specification}</p>
                    )}
                    {product.quantity <= product.minStock && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{product.sku}</td>
                <td className="px-4 py-3 text-sm">{product.brand || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {getCategoryName(categories, product.categoryId)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {getLocationName(locations, product.locationId)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {product.quantity} {product.unitOfMeasure || 'pcs'}
                </td>
                <td className="px-4 py-3 text-right">₹{product.price.toFixed(2)}</td>
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
        {filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            No products match your filters. Try adjusting your search criteria.
          </div>
        )}
        {products.length === 0 && (
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
