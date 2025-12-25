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
}

export const Dashboard: React.FC<DashboardProps> = ({ products, categories }) => {
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Products</p>
              <p className="text-3xl font-bold text-blue-900">{totalProducts}</p>
            </div>
            <Package className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-green-900">{totalQuantity}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Value</p>
              <p className="text-3xl font-bold text-purple-900">₹{totalValue.toFixed(2)}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-600" />
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Low Stock Items</p>
              <p className="text-3xl font-bold text-red-900">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Low Stock Alerts
          </h3>
          <div className="space-y-2">
            {lowStockItems.map((product) => (
              <div
                key={product.id}
                className="bg-white p-3 rounded border border-red-200 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-bold">{product.quantity} units</p>
                  <p className="text-sm text-gray-600">Min: {product.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Stock by Category</h3>
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
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-gray-600">
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
