import React, { useState } from 'react';
import { QrCode, Search, ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash, Package } from 'lucide-react';
import { HistoryEntry, Product } from '../../types';
import { getProductName } from '../../utils/helpers';
import { QRCodeModal } from './QRCodeModal';

interface HistoryViewProps {
  history: HistoryEntry[];
  products: Product[];
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  onPageChange?: (page: number) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  products,
  currentPage = 0,
  totalPages = 1,
  totalCount = 0,
  searchTerm = '',
  onSearchChange,
  onPageChange,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [localSearch, setLocalSearch] = useState(searchTerm);

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
        return <Trash className="w-5 h-5 text-gray-600" />;
      default:
        return <div className="w-5 h-5" />;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(localSearch);
    }
  };

  const formatDate = (entry: HistoryEntry) => {
    if (entry.date) {
      return new Date(entry.date).toLocaleDateString();
    }
    return new Date(entry.timestamp).toLocaleDateString();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const canShowQRCode = (action: string) => {
    return action === 'stock_in' || action === 'created';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Stock History</h2>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search product, category, notes, contact..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded w-80"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                if (onSearchChange) onSearchChange('');
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {history.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            Showing {history.length} {searchTerm ? 'filtered' : ''} entries
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-center text-sm font-medium w-10"></th>
                <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Received By / Issued To</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Price/Unit</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                <th className="px-4 py-3 text-center text-sm font-medium">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3 text-center">
                    {getActionIcon(entry.action)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(entry)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {getProductName(products, entry.productId)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {entry.quantity > 0 ? entry.quantity : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {entry.contactPerson || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {entry.pricePerUnit ? (
                      <div>
                        <div>₹{entry.pricePerUnit.toFixed(2)}</div>
                        {entry.quantity > 0 && (
                          <div className="text-xs text-gray-500">
                            Total: ₹{(entry.pricePerUnit * entry.quantity).toFixed(2)}
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.notes || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canShowQRCode(entry.action) ? (
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Show QR Code"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {history.length === 0 && searchTerm && (
          <div className="text-center py-12 text-gray-500">
            No history entries match your search.
          </div>
        )}
        {history.length === 0 && !searchTerm && (
          <div className="text-center py-12 text-gray-500">No history entries yet.</div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {currentPage * 50 + 1} to {Math.min((currentPage + 1) * 50, totalCount)} of {totalCount} entries
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

      {selectedEntry && (
        <QRCodeModal
          entry={selectedEntry}
          products={products}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
};
