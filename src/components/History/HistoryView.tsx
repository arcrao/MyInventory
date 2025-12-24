import React from 'react';
import { HistoryEntry, Product } from '../../types';
import { getProductName } from '../../utils/helpers';

interface HistoryViewProps {
  history: HistoryEntry[];
  products: Product[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, products }) => {
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Stock History</h2>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-sm">
                  {new Date(entry.timestamp).toLocaleString()}
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
                <td className="px-4 py-3 text-sm text-gray-600">{entry.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && (
          <div className="text-center py-12 text-gray-500">No history entries yet.</div>
        )}
      </div>
    </div>
  );
};
