import React, { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Product, HistoryEntry, HistoryDateRangeFilter } from '../../types';
import { StorageService } from '../../services/storage.service';

interface ProductTimelineReportProps {
  products: Product[];
}

interface ProductSummary {
  productId: number;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  stockInCount: number;
  stockOutCount: number;
  totalValueIn: number;
}

export const ProductTimelineReport: React.FC<ProductTimelineReportProps> = ({ products }) => {
  const [dateRange, setDateRange] = useState<HistoryDateRangeFilter>('all');
  const [allHistory, setAllHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Load all history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getAllHistory();
        setAllHistory(data);
      } catch (error) {
        console.error('Error loading history:', error);
        setAllHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  // Filter history by date range
  const filteredHistory = useMemo(() => {
    if (dateRange === 'all') return allHistory;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'today':
        startDate = today;
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
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
        return allHistory;
    }

    return allHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [allHistory, dateRange]);

  // Calculate summary for each product
  const productSummaries = useMemo((): ProductSummary[] => {
    const summaryMap = new Map<number, ProductSummary>();

    // Initialize with all products
    products.forEach(product => {
      summaryMap.set(product.id, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitOfMeasure: product.unitOfMeasure,
        totalIn: 0,
        totalOut: 0,
        currentStock: product.quantity,
        stockInCount: 0,
        stockOutCount: 0,
        totalValueIn: 0
      });
    });

    // Aggregate history data (filtered by date range)
    filteredHistory.forEach(entry => {
      if (entry.productId && summaryMap.has(entry.productId)) {
        const summary = summaryMap.get(entry.productId)!;

        if (entry.action === 'stock_in') {
          summary.totalIn += entry.quantity;
          summary.stockInCount++;
          if (entry.pricePerUnit) {
            summary.totalValueIn += entry.pricePerUnit * entry.quantity;
          }
        } else if (entry.action === 'stock_out') {
          summary.totalOut += entry.quantity;
          summary.stockOutCount++;
        }
      }
    });

    // Convert to array and sort by product name
    return Array.from(summaryMap.values())
      .filter(s => s.totalIn > 0 || s.totalOut > 0 || dateRange === 'all')
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [products, filteredHistory, dateRange]);

  // Calculate totals
  const totals = useMemo(() => {
    return productSummaries.reduce(
      (acc, summary) => ({
        totalIn: acc.totalIn + summary.totalIn,
        totalOut: acc.totalOut + summary.totalOut,
        totalValueIn: acc.totalValueIn + summary.totalValueIn,
        currentStock: acc.currentStock + summary.currentStock
      }),
      { totalIn: 0, totalOut: 0, totalValueIn: 0, currentStock: 0 }
    );
  }, [productSummaries]);

  const getDateRangeLabel = (range: HistoryDateRangeFilter): string => {
    switch (range) {
      case 'all': return 'All Time';
      case 'today': return 'Today';
      case 'weekly': return 'Last 7 Days';
      case 'current_month': return 'Current Month';
      case 'previous_month': return 'Previous Month';
      case '3_months': return 'Last 3 Months';
      default: return range;
    }
  };

  const handleExport = () => {
    if (productSummaries.length === 0) return;

    setIsExporting(true);
    try {
      const headers = [
        'Product Name',
        'SKU',
        'Unit',
        'Total Stock In',
        'Total Stock Out',
        'Current Stock',
        'Value In (₹)'
      ];

      const rows = productSummaries.map(summary => [
        summary.productName,
        summary.sku,
        summary.unitOfMeasure,
        summary.totalIn.toString(),
        summary.totalOut.toString(),
        summary.currentStock.toString(),
        summary.totalValueIn > 0 ? summary.totalValueIn.toFixed(2) : ''
      ]);

      // Add totals row
      rows.push([
        'TOTAL',
        '',
        '',
        totals.totalIn.toString(),
        totals.totalOut.toString(),
        totals.currentStock.toString(),
        totals.totalValueIn > 0 ? totals.totalValueIn.toFixed(2) : ''
      ]);

      const csvContent = [
        `Product Timeline Report`,
        `Date Range: ${getDateRangeLabel(dateRange)}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Products with Activity: ${productSummaries.length}`,
        '',
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `product_timeline_report_${timestamp}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h2 className="text-xl sm:text-2xl font-bold">Product Timeline Report</h2>

          {productSummaries.length > 0 && (
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

        {/* Date Range Filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as HistoryDateRangeFilter)}
            className="px-3 sm:px-4 py-2 border rounded bg-white text-sm min-h-[44px]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="weekly">Last 7 Days</option>
            <option value="current_month">Current Month</option>
            <option value="previous_month">Previous Month</option>
            <option value="3_months">Last 3 Months</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading report...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xl font-bold">{totals.totalIn}</span>
              </div>
              <p className="text-xs text-gray-600">Total Stock In</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="w-5 h-5" />
                <span className="text-xl font-bold">{totals.totalOut}</span>
              </div>
              <p className="text-xs text-gray-600">Total Stock Out</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <Package className="w-5 h-5" />
                <span className="text-xl font-bold">{totals.currentStock}</span>
              </div>
              <p className="text-xs text-gray-600">Current Total Stock</p>
            </div>
            {totals.totalValueIn > 0 && (
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-purple-600 mb-1">
                  ₹{totals.totalValueIn.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">Total Value In</p>
              </div>
            )}
          </div>

          {/* Product Summary Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            {productSummaries.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                Showing {productSummaries.length} products
                {dateRange !== 'all' && ` with activity in ${getDateRangeLabel(dateRange).toLowerCase()}`}
              </div>
            )}

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y">
              {productSummaries.map((summary) => (
                <div key={summary.productId} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{summary.productName}</div>
                      <div className="text-xs text-gray-500">SKU: {summary.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {summary.currentStock} {summary.unitOfMeasure}
                      </div>
                      <div className="text-xs text-gray-500">Current Stock</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 rounded p-2">
                      <div className="text-green-600 font-semibold">+{summary.totalIn}</div>
                      <div className="text-xs text-gray-600">Stock In</div>
                    </div>
                    <div className="bg-red-50 rounded p-2">
                      <div className="text-red-600 font-semibold">-{summary.totalOut}</div>
                      <div className="text-xs text-gray-600">Stock Out</div>
                    </div>
                    <div className="bg-blue-50 rounded p-2">
                      <div className="text-blue-600 font-semibold">{summary.currentStock}</div>
                      <div className="text-xs text-gray-600">Current</div>
                    </div>
                  </div>

                  {summary.totalValueIn > 0 && (
                    <div className="mt-2 text-sm text-gray-600 text-right">
                      Value In: ₹{summary.totalValueIn.toLocaleString()}
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
                    <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-green-600">Stock In</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-red-600">Stock Out</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-blue-600">Current Stock</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Value In</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productSummaries.map((summary) => (
                    <tr key={summary.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{summary.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{summary.sku}</td>
                      <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                        +{summary.totalIn} {summary.unitOfMeasure}
                        {summary.stockInCount > 0 && (
                          <span className="text-xs text-gray-400 ml-1">({summary.stockInCount})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                        -{summary.totalOut} {summary.unitOfMeasure}
                        {summary.stockOutCount > 0 && (
                          <span className="text-xs text-gray-400 ml-1">({summary.stockOutCount})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                        {summary.currentStock} {summary.unitOfMeasure}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {summary.totalValueIn > 0 ? `₹${summary.totalValueIn.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-sm" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">+{totals.totalIn}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">-{totals.totalOut}</td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">{totals.currentStock}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {totals.totalValueIn > 0 ? `₹${totals.totalValueIn.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Empty State */}
            {productSummaries.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No stock movements found
                {dateRange !== 'all' && ` in ${getDateRangeLabel(dateRange).toLowerCase()}`}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
