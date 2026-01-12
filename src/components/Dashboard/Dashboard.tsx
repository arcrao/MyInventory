import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { Product, Category } from '../../types';
import { StorageService } from '../../services/storage.service';
import {
  getLowStockProducts,
  getTotalValue,
  getTotalQuantity,
  getProductsByCategory,
  getCategoryQuantity,
} from '../../utils/helpers';

interface DashboardProps {
  products: Product[];
  categories: Category[];
  onViewProduct?: (product: Product) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ products, categories, onViewProduct }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        // Fetch ALL products without pagination for accurate dashboard stats
        const data = await StorageService.getProducts();
        setAllProducts(data);
      } catch (error) {
        console.error('[Dashboard] Error fetching all products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, [products]); // Re-fetch when products prop changes (e.g., after add/edit/delete)

  const lowStockItems = getLowStockProducts(allProducts);
  const totalValue = getTotalValue(allProducts);
  const totalProducts = allProducts.length;
  const totalQuantity = getTotalQuantity(allProducts);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Products</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900">{totalProducts}</p>
            </div>
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium">Total Items</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-900">{totalQuantity}</p>
            </div>
            <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 p-4 sm:p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-purple-600 font-medium">Total Value</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-900">₹{totalValue.toFixed(2)}</p>
            </div>
            <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
          </div>
        </div>
        <div className="bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-red-600 font-medium">Low Stock Items</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-900">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Low Stock Alerts
          </h3>
          <div className="space-y-2">
            {lowStockItems.map((product) => (
              <div
                key={product.id}
                className="bg-white p-3 rounded border border-red-200 flex justify-between items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  {onViewProduct ? (
                    <button
                      onClick={() => onViewProduct(product)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left text-sm sm:text-base truncate block w-full"
                    >
                      {product.name}
                    </button>
                  ) : (
                    <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-red-600 font-bold text-sm">{product.quantity}</p>
                  <p className="text-xs text-gray-600">Min: {product.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold mb-4">Stock by Category</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => {
              const catProducts = getProductsByCategory(allProducts, cat.id);
              const catQuantity = getCategoryQuantity(allProducts, cat.id);
              return (
                <div
                  key={cat.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded gap-1"
                >
                  <span className="font-medium text-sm sm:text-base">{cat.name}</span>
                  <span className="text-gray-600 text-xs sm:text-sm">
                    {catProducts.length} products, {catQuantity} items
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
