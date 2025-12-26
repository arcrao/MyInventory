import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Plus, Minus, Edit, Trash2 } from 'lucide-react';
import { Product, Category, Location, HistoryEntry } from '../../types';
import { StorageService } from '../../services/storage.service';

interface ProductDetailProps {
  product: Product;
  categories: Category[];
  locations: Location[];
  onBack: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  categories,
  locations,
  onBack,
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [product.id]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await StorageService.getHistoryByProduct(product.id);
      setHistory(data);
    } catch (error) {
      console.error('Error loading product history:', error);
    } finally {
      setLoading(false);
    }
  };

  const category = categories.find((c) => c.id === product.categoryId);
  const location = locations.find((l) => l.id === product.locationId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'stock_in':
        return <Plus className="w-5 h-5 text-green-600" />;
      case 'stock_out':
        return <Minus className="w-5 h-5 text-red-600" />;
      case 'created':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'updated':
        return <Edit className="w-5 h-5 text-yellow-600" />;
      case 'deleted':
        return <Trash2 className="w-5 h-5 text-gray-600" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'stock_in':
        return 'Stock In';
      case 'stock_out':
        return 'Stock Out';
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      default:
        return action;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Products
      </button>

      {/* Product Details Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{product.name}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">SKU</p>
            <p className="font-medium text-gray-900">{product.sku}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="font-medium text-gray-900">{category?.name || '-'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="font-medium text-gray-900">{location?.name || '-'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="font-medium text-gray-900">
              {product.quantity} {product.unitOfMeasure}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Min Stock</p>
            <p className="font-medium text-gray-900">
              {product.minStock} {product.unitOfMeasure}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Price</p>
            <p className="font-medium text-gray-900">₹{product.price.toFixed(2)}</p>
          </div>

          {product.brand && (
            <div>
              <p className="text-sm text-gray-600">Brand</p>
              <p className="font-medium text-gray-900">{product.brand}</p>
            </div>
          )}

          {product.description && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-medium text-gray-900">{product.description}</p>
            </div>
          )}

          {product.specification && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-gray-600">Specification</p>
              <p className="font-medium text-gray-900">{product.specification}</p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
          <p className="text-sm text-gray-600 mt-1">
            All transactions for this product
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transaction history found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Contact Person
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Price/Unit
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getActionIcon(entry.action)}
                          <span className="text-sm font-medium">
                            {getActionLabel(entry.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {entry.quantity > 0 ? (
                          <span className={
                            entry.action === 'stock_in'
                              ? 'text-green-600 font-medium'
                              : entry.action === 'stock_out'
                              ? 'text-red-600 font-medium'
                              : 'text-gray-900'
                          }>
                            {entry.action === 'stock_in' ? '+' : entry.action === 'stock_out' ? '-' : ''}
                            {entry.quantity}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.contactPerson || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {entry.pricePerUnit ? `₹${entry.pricePerUnit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
