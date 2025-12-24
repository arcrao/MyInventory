import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { HistoryEntry, Product } from '../../types';
import { getProductName } from '../../utils/helpers';
import { QRCodeModal } from './QRCodeModal';

interface HistoryViewProps {
  history: HistoryEntry[];
  products: Product[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, products }) => {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'stock_in':
        return 'bg-green-100 text-green-800';
      case 'stock_out':
        return 'bg-red-100 text-red-800';
      case 'created':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <h2 className="text-2xl font-bold mb-4">Stock History</h2>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Details</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                <th className="px-4 py-3 text-center text-sm font-medium">QR Code</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-sm">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(entry)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getProductName(products, entry.productId)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${getActionColor(
                        entry.action
                      )}`}
                    >
                      {entry.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{entry.quantity}</td>
                  <td className="px-4 py-3 text-sm">
                    {entry.action === 'stock_in' && (
                      <div className="space-y-1">
                        {entry.receivedBy && (
                          <div className="text-gray-700">
                            <span className="font-medium">Received by:</span> {entry.receivedBy}
                          </div>
                        )}
                        {entry.pricePerUnit !== undefined && (
                          <div className="text-gray-700">
                            <span className="font-medium">Price/Unit:</span> ${entry.pricePerUnit.toFixed(2)}
                            {entry.quantity > 0 && (
                              <span className="text-gray-500 ml-2">
                                (Total: ${(entry.pricePerUnit * entry.quantity).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {entry.action === 'stock_out' && entry.issuedTo && (
                      <div className="text-gray-700">
                        <span className="font-medium">Issued to:</span> {entry.issuedTo}
                      </div>
                    )}
                    {entry.action !== 'stock_in' && entry.action !== 'stock_out' && (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{entry.notes || '-'}</td>
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
        {history.length === 0 && (
          <div className="text-center py-12 text-gray-500">No history entries yet.</div>
        )}
      </div>

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
