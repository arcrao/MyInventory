import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Plus, Minus, Edit, Trash, Package, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Product, HistoryEntry, HistoryDateRangeFilter } from '../../types';
import { StorageService } from '../../services/storage.service';

interface ProductTimelineReportProps {
  products: Product[];
}

interface TimelineEntry extends HistoryEntry {
  runningBalance: number;
}

export const ProductTimelineReport: React.FC<ProductTimelineReportProps> = ({ products }) => {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<HistoryDateRangeFilter>('all');
  const [timeline, setTimeline] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const search = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search)
    );
  }, [products, searchTerm]);

  // Load timeline when product or date range changes
  useEffect(() => {
    const loadTimeline = async () => {
      if (!selectedProductId) {
        setTimeline([]);
        return;
      }

      setLoading(true);
      try {
        const data = await StorageService.getHistoryByProduct(selectedProductId);
        setTimeline(data);
      } catch (error) {
        console.error('Error loading product timeline:', error);
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
  }, [selectedProductId]);

  // Filter timeline by date range
  const filteredTimeline = useMemo(() => {
    if (dateRange === 'all') return timeline;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'today':
        startDate = today;
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'weekly':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'previous_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case '3_months':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        return timeline;
    }

    return timeline.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [timeline, dateRange]);

  // Calculate running balance for each entry
  const timelineWithBalance = useMemo((): TimelineEntry[] => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct || filteredTimeline.length === 0) return [];

    // Start from the current quantity and work backwards
    let currentBalance = selectedProduct.quantity;

    // First, calculate what the balance was before the filtered period
    // by subtracting/adding quantities from the filtered entries
    const sortedTimeline = [...filteredTimeline].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate balances going backwards in time
    const withBalances: TimelineEntry[] = [];
    let runningBalance = currentBalance;

    for (const entry of sortedTimeline) {
      withBalances.push({
        ...entry,
        runningBalance: runningBalance
      });

      // Adjust running balance for the next (older) entry
      if (entry.action === 'stock_in') {
        runningBalance -= entry.quantity;
      } else if (entry.action === 'stock_out') {
        runningBalance += entry.quantity;
      } else if (entry.action === 'created') {
        // For created, the balance before was 0
        runningBalance = 0;
      }
    }

    return withBalances;
  }, [filteredTimeline, products, selectedProductId]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const stockInEntries = filteredTimeline.filter(e => e.action === 'stock_in');
    const stockOutEntries = filteredTimeline.filter(e => e.action === 'stock_out');

    const totalIn = stockInEntries.reduce((sum, e) => sum + e.quantity, 0);
    const totalOut = stockOutEntries.reduce((sum, e) => sum + e.quantity, 0);
    const totalValue = stockInEntries.reduce((sum, e) =>
      sum + (e.pricePerUnit ? e.pricePerUnit * e.quantity : 0), 0
    );

    return {
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      stockInCount: stockInEntries.length,
      stockOutCount: stockOutEntries.length,
      totalValue
    };
  }, [filteredTimeline]);

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

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'stock_in': return 'Stock In';
      case 'stock_out': return 'Stock Out';
      case 'created': return 'Created';
      case 'updated': return 'Updated';
      case 'deleted': return 'Deleted';
      default: return action;
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

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleExport = () => {
    if (!selectedProduct || timelineWithBalance.length === 0) return;

    setIsExporting(true);
    try {
      const headers = [
        'Date',
        'Timestamp',
        'Action',
        'Quantity',
        'Running Balance',
        'Contact Person',
        'Price/Unit',
        'Total Value',
        'Notes'
      ];

      const rows = timelineWithBalance.map(entry => [
        formatDate(entry),
        entry.timestamp,
        getActionLabel(entry.action),
        entry.quantity.toString(),
        entry.runningBalance.toString(),
        entry.contactPerson || '',
        entry.pricePerUnit ? entry.pricePerUnit.toFixed(2) : '',
        entry.pricePerUnit ? (entry.pricePerUnit * entry.quantity).toFixed(2) : '',
        entry.notes || ''
      ]);

      const csvContent = [
        `Product Timeline Report: ${selectedProduct.name}`,
        `SKU: ${selectedProduct.sku}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Date Range: ${dateRange === 'all' ? 'All Time' : dateRange.replace('_', ' ')}`,
        '',
        `Summary:`,
        `Total Stock In: ${summaryStats.totalIn} ${selectedProduct.unitOfMeasure}`,
        `Total Stock Out: ${summaryStats.totalOut} ${selectedProduct.unitOfMeasure}`,
        `Net Change: ${summaryStats.netChange >= 0 ? '+' : ''}${summaryStats.netChange} ${selectedProduct.unitOfMeasure}`,
        `Current Balance: ${selectedProduct.quantity} ${selectedProduct.unitOfMeasure}`,
        '',
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `product_timeline_${selectedProduct.sku}_${timestamp}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting timeline:', error);
      alert('Failed to export timeline. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h2 className="text-xl sm:text-2xl font-bold">Product Timeline Report</h2>

          {selectedProduct && timelineWithBalance.length > 0 && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400 text-sm min-h-[44px] w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
        </div>

        {/* Product Selection and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {/* Product Selector */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded w-full text-sm min-h-[44px]"
              />
            </div>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as HistoryDateRangeFilter)}
              className="px-3 sm:px-4 py-2 border rounded bg-white text-sm min-h-[44px]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="weekly">Last 7 Days</option>
              <option value="current_month">Current Month</option>
              <option value="previous_month">Previous Month</option>
              <option value="3_months">Last 3 Months</option>
            </select>
          </div>

          {/* Product Dropdown */}
          <div className="bg-white border rounded-lg p-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a Product
            </label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => setSelectedProductId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded bg-white text-sm min-h-[44px]"
            >
              <option value="">-- Select a product --</option>
              {filteredProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} (SKU: {product.sku}) - Current: {product.quantity} {product.unitOfMeasure}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading timeline...</p>
        </div>
      )}

      {/* No Product Selected */}
      {!selectedProductId && !loading && (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a product to view its stock movement timeline</p>
        </div>
      )}

      {/* Product Info & Summary */}
      {selectedProduct && !loading && (
        <>
          {/* Product Summary Card */}
          <div className="bg-white border rounded-lg p-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {selectedProduct.quantity} {selectedProduct.unitOfMeasure}
                </p>
                <p className="text-sm text-gray-500">Current Stock</p>
              </div>
            </div>

            {/* Summary Stats */}
            {filteredTimeline.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-lg font-semibold">{summaryStats.totalIn}</span>
                  </div>
                  <p className="text-xs text-gray-600">Total In ({summaryStats.stockInCount} entries)</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-lg font-semibold">{summaryStats.totalOut}</span>
                  </div>
                  <p className="text-xs text-gray-600">Total Out ({summaryStats.stockOutCount} entries)</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className={`text-lg font-semibold mb-1 ${summaryStats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summaryStats.netChange >= 0 ? '+' : ''}{summaryStats.netChange}
                  </div>
                  <p className="text-xs text-gray-600">Net Change</p>
                </div>
                {summaryStats.totalValue > 0 && (
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="text-lg font-semibold text-purple-600 mb-1">
                      ₹{summaryStats.totalValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600">Total Value In</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white border rounded-lg overflow-hidden">
            {timelineWithBalance.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                Showing {timelineWithBalance.length} entries
              </div>
            )}

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y">
              {timelineWithBalance.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(entry.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                          entry.action === 'stock_in' ? 'bg-green-100 text-green-800' :
                          entry.action === 'stock_out' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getActionLabel(entry.action)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        entry.action === 'stock_in' ? 'text-green-600' :
                        entry.action === 'stock_out' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {entry.action === 'stock_in' ? '+' : entry.action === 'stock_out' ? '-' : ''}
                        {entry.quantity}
                      </div>
                      <div className="text-xs text-gray-500">
                        Balance: {entry.runningBalance}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm ml-8">
                    <div className="text-gray-500">Date:</div>
                    <div className="text-gray-900">{formatDate(entry)}</div>
                    {entry.contactPerson && (
                      <>
                        <div className="text-gray-500">
                          {entry.action === 'stock_in' ? 'Received By:' : 'Issued To:'}
                        </div>
                        <div className="text-gray-900">{entry.contactPerson}</div>
                      </>
                    )}
                    {entry.pricePerUnit && (
                      <>
                        <div className="text-gray-500">Price/Unit:</div>
                        <div className="text-gray-900">₹{entry.pricePerUnit.toFixed(2)}</div>
                        <div className="text-gray-500">Total:</div>
                        <div className="text-gray-900 font-medium">
                          ₹{(entry.pricePerUnit * entry.quantity).toFixed(2)}
                        </div>
                      </>
                    )}
                  </div>

                  {entry.notes && entry.notes !== '-' && (
                    <div className="mt-3 pt-3 border-t ml-8">
                      <div className="text-xs text-gray-500 mb-1">Notes:</div>
                      <div className="text-sm text-gray-700">{entry.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-center text-sm font-medium w-10"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Action</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Balance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Price/Unit</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {timelineWithBalance.map((entry) => (
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
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          entry.action === 'stock_in' ? 'bg-green-100 text-green-800' :
                          entry.action === 'stock_out' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getActionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={
                          entry.action === 'stock_in' ? 'text-green-600' :
                          entry.action === 'stock_out' ? 'text-red-600' :
                          'text-gray-600'
                        }>
                          {entry.action === 'stock_in' ? '+' : entry.action === 'stock_out' ? '-' : ''}
                          {entry.quantity} {selectedProduct.unitOfMeasure}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">
                        {entry.runningBalance} {selectedProduct.unitOfMeasure}
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
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {timelineWithBalance.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No stock movements found for this product
                {dateRange !== 'all' && ' in the selected date range'}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
