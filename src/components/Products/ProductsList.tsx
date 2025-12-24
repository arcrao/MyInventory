import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Product, Category, Location } from '../../types';
import { getCategoryName, getLocationName } from '../../utils/helpers';
import { ProductFilters } from './ProductFilters';

interface ProductsListProps {
  products: Product[];
  categories: Category[];
  locations: Location[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: number) => void;
  onStockAdjust: (product: Product) => void;
}

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  categories,
  locations,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onStockAdjust,
}) => {
  const [filters, setFilters] = useState({ searchTerm: '', categoryId: '' });

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products</h2>
        <button
          onClick={onAddProduct}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

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
                <td className="px-4 py-3 text-right">${product.price.toFixed(2)}</td>
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
    </div>
  );
};
