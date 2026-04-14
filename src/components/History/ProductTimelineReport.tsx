import React, { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { HistoryEntry, HistoryDateRangeFilter, HistoryActionFilter } from '../../types';
import { StorageService } from '../../services/storage.service';

interface ProductSummary {
  productId: number;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  categoryId: string;
  categoryName: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  stockInCount: number;
  stockOutCount: number;
  totalValueIn: number;
}

interface CategoryGroup {
  categoryName: string;
  summaries: ProductSummary[];
  totalIn: number;
  totalOut: number;
  currentStock: number;
  totalValueIn: number;
}

export const ProductTimelineReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<HistoryDateRangeFilter>('all');
  const [actionFilter, setActionFilter] = useState<HistoryActionFilter>('all');
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [productStockMap, setProductStockMap] = useState<Map<number, { quantity: number; sku: string; unitOfMeasure: string; categoryId: string; categoryName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [excludeNoActivity, setExcludeNoActivity] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getAllHistory(dateRange, actionFilter);
        setHistoryData(data);

        const productIds = [...new Set(data.map(e => e.productId).filter((id): id is number => id !== null))];
        const stockMap = await StorageService.getProductsByIds(productIds);
        setProductStockMap(stockMap);
      } catch (error) {
        console.error('Error loading history:', error);
        setHistoryData([]);
        setProductStockMap(new Map());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, actionFilter]);

  const productSummaries = useMemo((): ProductSummary[] => {
    const summaryMap = new Map<number, ProductSummary>();

    historyData.forEach(entry => {
      if (!entry.productId) return;

      if (!summaryMap.has(entry.productId)) {
        const info = productStockMap.get(entry.productId);
        summaryMap.set(entry.productId, {
          productId: entry.productId,
          productName: entry.productName || 'Unknown Product',
          sku: info?.sku || '-',
          unitOfMeasure: entry.unitOfMeasure || info?.unitOfMeasure || 'pcs',
          categoryId: info?.categoryId || '',
          categoryName: info?.categoryName || 'Uncategorized',
          totalIn: 0,
          totalOut: 0,
          currentStock: info?.quantity || 0,
          stockInCount: 0,
          stockOutCount: 0,
          totalValueIn: 0
        });
      }

      const summary = summaryMap.get(entry.productId)!;
      if (entry.action === 'stock_in') {
        summary.totalIn += entry.quantity;
        summary.stockInCount++;
        if (entry.pricePerUnit) summary.totalValueIn += entry.pricePerUnit * entry.quantity;
      } else if (entry.action === 'stock_out') {
        summary.totalOut += entry.quantity;
        summary.stockOutCount++;
      }
    });

    let result = Array.from(summaryMap.values()).sort((a, b) => a.productName.localeCompare(b.productName));

    if (excludeNoActivity) {
      result = result.filter(s => s.totalIn > 0 || s.totalOut > 0);
    }

    return result;
  }, [historyData, productStockMap, excludeNoActivity]);

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groupMap = new Map<string, CategoryGroup>();

    productSummaries.forEach(summary => {
      const key = summary.categoryName;
      if (!groupMap.has(key)) {
        groupMap.set(key, { categoryName: key, summaries: [], totalIn: 0, totalOut: 0, currentStock: 0, totalValueIn: 0 });
      }
      const group = groupMap.get(key)!;
      group.summaries.push(summary);
      group.totalIn += summary.totalIn;
      group.totalOut += summary.totalOut;
      group.currentStock += summary.currentStock;
      group.totalValueIn += summary.totalValueIn;
    });

    return Array.from(groupMap.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [productSummaries]);

  const totals = useMemo(() => ({
    totalIn: productSummaries.reduce((s, p) => s + p.totalIn, 0),
    totalOut: productSummaries.reduce((s, p) => s + p.totalOut, 0),
    currentStock: productSummaries.reduce((s, p) => s + p.currentStock, 0),
    totalValueIn: productSummaries.reduce((s, p) => s + p.totalValueIn, 0),
  }), [productSummaries]);

  const toggleCategory = (name: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const getDateRangeLabel = (range: HistoryDateRangeFilter) => {
    const labels: Record<string, string> = {
      all: 'All Time', today: 'Today', weekly: 'Last 7 Days',
      current_month: 'Current Month', previous_month: 'Previous Month', '3_months': 'Last 3 Months'
    };
    return labels[range] || range;
  };

  const handleExport = () => {
    if (productSummaries.length === 0) return;
    setIsExporting(true);
    try {
      const rows: string[][] = [];
      categoryGroups.forEach(group => {
        rows.push([group.categoryName.toUpperCase(), '', '', '', '', '', '']);
        group.summaries.forEach(s => {
          rows.push([s.productName, s.sku, s.unitOfMeasure, s.totalIn.toString(), s.totalOut.toString(), s.currentStock.toString(), s.totalValueIn > 0 ? s.totalValueIn.toFixed(2) : '']);
        });
        rows.push(['', '', 'Category Total', group.totalIn.toString(), group.totalOut.toString(), group.currentStock.toString(), group.totalValueIn > 0 ? group.totalValueIn.toFixed(2) : '']);
        rows.push([]);
      });
      rows.push(['GRAND TOTAL', '', '', totals.totalIn.toString(), totals.totalOut.toString(), totals.currentStock.toString(), totals.totalValueIn > 0 ? totals.totalValueIn.toFixed(2) : '']);

      const csvContent = [
        `Product Timeline Report`,
        `Date Range: ${getDateRangeLabel(dateRange)}`,
        `Generated: ${new Date().toLocaleString()}`,
        '',
        ['Category / Product', 'SKU', 'Unit', 'Stock In', 'Stock Out', 'Current Stock', 'Value In (₹)'].join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `product_timeline_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (error) {
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Header + Export */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h2 className="text-xl sm:text-2xl font-bold">Product Timeline Report</h2>
          {productSummaries.length > 0 && (
            <button onClick={handleExport} disabled={isExporting}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400 text-sm min-h-[44px] w-full sm:w-auto justify-center">
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as HistoryDateRangeFilter)}
            className="px-3 py-2 border rounded bg-white text-sm min-h-[44px]">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="weekly">Last 7 Days</option>
            <option value="current_month">Current Month</option>
            <option value="previous_month">Previous Month</option>
            <option value="3_months">Last 3 Months</option>
          </select>

          <label className="text-sm font-medium text-gray-700">Action:</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as HistoryActionFilter)}
            className="px-3 py-2 border rounded bg-white text-sm min-h-[44px]">
            <option value="all">All Actions</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-2">
            <input type="checkbox" checked={excludeNoActivity} onChange={(e) => setExcludeNoActivity(e.target.checked)}
              className="w-4 h-4" />
            Exclude no activity
          </label>
        </div>
      </div>

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
                <div className="text-xl font-bold text-purple-600 mb-1">₹{totals.totalValueIn.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Total Value In</p>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            {productSummaries.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                {productSummaries.length} products across {categoryGroups.length} categories | {historyData.length} history records
              </div>
            )}

            {/* Mobile View */}
            <div className="block md:hidden divide-y">
              {categoryGroups.map(group => (
                <div key={group.categoryName}>
                  <button onClick={() => toggleCategory(group.categoryName)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 font-semibold text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      {collapsedCategories.has(group.categoryName)
                        ? <ChevronRight className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                      {group.categoryName}
                      <span className="text-gray-500 font-normal">({group.summaries.length})</span>
                    </div>
                    <span className="text-blue-600">{group.currentStock}</span>
                  </button>
                  {!collapsedCategories.has(group.categoryName) && group.summaries.map(summary => (
                    <div key={summary.productId} className="p-4 border-b last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{summary.productName}</div>
                          <div className="text-xs text-gray-500">SKU: {summary.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">{summary.currentStock} {summary.unitOfMeasure}</div>
                          <div className="text-xs text-gray-500">Current</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        <div className="bg-green-50 rounded p-1">
                          <div className="text-green-600 font-semibold">+{summary.totalIn}</div>
                          <div className="text-xs text-gray-500">In</div>
                        </div>
                        <div className="bg-red-50 rounded p-1">
                          <div className="text-red-600 font-semibold">-{summary.totalOut}</div>
                          <div className="text-xs text-gray-500">Out</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Desktop View */}
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
                  {categoryGroups.map(group => (
                    <React.Fragment key={group.categoryName}>
                      {/* Category header row */}
                      <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200"
                        onClick={() => toggleCategory(group.categoryName)}>
                        <td className="px-4 py-2 font-semibold text-sm text-gray-700" colSpan={2}>
                          <div className="flex items-center gap-2">
                            {collapsedCategories.has(group.categoryName)
                              ? <ChevronRight className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />}
                            {group.categoryName}
                            <span className="text-gray-500 font-normal text-xs">({group.summaries.length} products)</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-green-600 font-semibold">+{group.totalIn}</td>
                        <td className="px-4 py-2 text-right text-sm text-red-600 font-semibold">-{group.totalOut}</td>
                        <td className="px-4 py-2 text-right text-sm text-blue-600 font-semibold">{group.currentStock}</td>
                        <td className="px-4 py-2 text-right text-sm">{group.totalValueIn > 0 ? `₹${group.totalValueIn.toLocaleString()}` : '-'}</td>
                      </tr>
                      {/* Product rows */}
                      {!collapsedCategories.has(group.categoryName) && group.summaries.map(summary => (
                        <tr key={summary.productId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm pl-10">{summary.productName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{summary.sku}</td>
                          <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                            {summary.totalIn > 0 ? `+${summary.totalIn} ${summary.unitOfMeasure}` : '-'}
                            {summary.stockInCount > 0 && <span className="text-xs text-gray-400 ml-1">({summary.stockInCount})</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                            {summary.totalOut > 0 ? `-${summary.totalOut} ${summary.unitOfMeasure}` : '-'}
                            {summary.stockOutCount > 0 && <span className="text-xs text-gray-400 ml-1">({summary.stockOutCount})</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                            {summary.currentStock} {summary.unitOfMeasure}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {summary.totalValueIn > 0 ? `₹${summary.totalValueIn.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold border-t-2">
                  <tr>
                    <td className="px-4 py-3 text-sm" colSpan={2}>GRAND TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">+{totals.totalIn}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">-{totals.totalOut}</td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">{totals.currentStock}</td>
                    <td className="px-4 py-3 text-right text-sm">{totals.totalValueIn > 0 ? `₹${totals.totalValueIn.toLocaleString()}` : '-'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {productSummaries.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No stock movements found{dateRange !== 'all' && ` in ${getDateRangeLabel(dateRange).toLowerCase()}`}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
