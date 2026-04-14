import React, { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Package, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { HistoryEntry, HistoryDateRangeFilter, HistoryActionFilter } from '../../types';
import { StorageService } from '../../services/storage.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [actionFilter, setActionFilter] = useState<HistoryActionFilter>('all');
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [productStockMap, setProductStockMap] = useState<Map<number, { quantity: number; sku: string; unitOfMeasure: string; categoryId: string; categoryName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [excludeNoActivity, setExcludeNoActivity] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    // For custom range, only fetch when both dates are set
    if (dateRange === 'custom' && (!customStart || !customEnd)) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getAllHistory(dateRange, actionFilter, customStart, customEnd);
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
  }, [dateRange, actionFilter, customStart, customEnd]);

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
    if (excludeNoActivity) result = result.filter(s => s.totalIn > 0 || s.totalOut > 0);
    return result;
  }, [historyData, productStockMap, excludeNoActivity]);

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groupMap = new Map<string, CategoryGroup>();
    productSummaries.forEach(summary => {
      const key = summary.categoryName;
      if (!groupMap.has(key)) groupMap.set(key, { categoryName: key, summaries: [], totalIn: 0, totalOut: 0, currentStock: 0, totalValueIn: 0 });
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

  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && customStart && customEnd) return `${customStart} to ${customEnd}`;
    const labels: Record<string, string> = {
      all: 'All Time', today: 'Today', weekly: 'Last 7 Days',
      current_month: 'Current Month', previous_month: 'Previous Month', '3_months': 'Last 3 Months'
    };
    return labels[dateRange] || dateRange;
  };

  const handleExportCSV = () => {
    if (productSummaries.length === 0) return;
    setIsExporting(true);
    try {
      const rows: string[][] = [];
      categoryGroups.forEach(group => {
        rows.push([group.categoryName.toUpperCase(), '', '', '', '', '', '']);
        group.summaries.forEach(s => rows.push([s.productName, s.sku, s.unitOfMeasure, s.totalIn.toString(), s.totalOut.toString(), s.currentStock.toString(), s.totalValueIn > 0 ? s.totalValueIn.toFixed(2) : '']));
        rows.push(['', '', 'Category Total', group.totalIn.toString(), group.totalOut.toString(), group.currentStock.toString(), group.totalValueIn > 0 ? group.totalValueIn.toFixed(2) : '']);
        rows.push([]);
      });
      rows.push(['GRAND TOTAL', '', '', totals.totalIn.toString(), totals.totalOut.toString(), totals.currentStock.toString(), totals.totalValueIn > 0 ? totals.totalValueIn.toFixed(2) : '']);

      const csvContent = [
        'Stock Movement Report', `Period: ${getDateRangeLabel()}`, `Generated: ${new Date().toLocaleString()}`, '',
        ['Category / Product', 'SKU', 'Unit', 'Stock In', 'Stock Out', 'Current Stock', 'Value In (₹)'].join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stock_movement_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (error) {
      alert('Failed to export CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (productSummaries.length === 0) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      // Title
      doc.setFontSize(16);
      doc.text('Stock Movement Report', 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${getDateRangeLabel()}`, 14, 23);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);
      doc.text(`Products: ${productSummaries.length}  |  History records: ${historyData.length}`, 14, 35);

      // Summary row
      doc.setTextColor(0);
      doc.setFontSize(9);
      doc.text(`Total In: ${totals.totalIn}   Total Out: ${totals.totalOut}   Current Stock: ${totals.currentStock}${totals.totalValueIn > 0 ? `   Value In: ₹${totals.totalValueIn.toLocaleString()}` : ''}`, 14, 42);

      const tableBody: any[] = [];
      categoryGroups.forEach(group => {
        // Category header row (no totals - only grand total at end)
        tableBody.push([
          { content: group.categoryName.toUpperCase(), colSpan: 6, styles: { fillColor: [220, 220, 220], fontStyle: 'bold', textColor: [50, 50, 50] } },
        ]);
        // Product rows
        group.summaries.forEach(s => {
          tableBody.push([
            `  ${s.productName}`,
            s.sku,
            s.totalIn > 0 ? `+${s.totalIn} ${s.unitOfMeasure}` : '-',
            s.totalOut > 0 ? `-${s.totalOut} ${s.unitOfMeasure}` : '-',
            `${s.currentStock} ${s.unitOfMeasure}`,
            s.totalValueIn > 0 ? `₹${s.totalValueIn.toLocaleString()}` : '-',
          ]);
        });
      });

      autoTable(doc, {
        startY: 46,
        head: [['Product', 'SKU', 'Stock In', 'Stock Out', 'Current Stock', 'Value In']],
        body: tableBody,
        foot: [['GRAND TOTAL', '', `+${totals.totalIn}`, `-${totals.totalOut}`, totals.currentStock.toString(), totals.totalValueIn > 0 ? `₹${totals.totalValueIn.toLocaleString()}` : '-']],
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [243, 244, 246], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 2: { textColor: [22, 163, 74] }, 3: { textColor: [220, 38, 38] }, 4: { textColor: [37, 99, 235], fontStyle: 'bold' } },
        margin: { left: 14, right: 14 },
      });

      doc.save(`stock_movement_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      alert('Failed to export PDF.');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h2 className="text-xl sm:text-2xl font-bold">Stock Movement Report</h2>
          {productSummaries.length > 0 && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleExportCSV} disabled={isExporting}
                className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400 text-sm min-h-[44px] justify-center">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={handleExportPDF}
                className="flex-1 sm:flex-none bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 flex items-center gap-2 text-sm min-h-[44px] justify-center">
                <FileText className="w-4 h-4" /> PDF
              </button>
            </div>
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
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border rounded text-sm min-h-[44px]" />
              <span className="text-sm text-gray-500">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border rounded text-sm min-h-[44px]" />
            </>
          )}

          <label className="text-sm font-medium text-gray-700">Action:</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as HistoryActionFilter)}
            className="px-3 py-2 border rounded bg-white text-sm min-h-[44px]">
            <option value="all">All Actions</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-2">
            <input type="checkbox" checked={excludeNoActivity} onChange={(e) => setExcludeNoActivity(e.target.checked)} className="w-4 h-4" />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="w-5 h-5" /><span className="text-xl font-bold">{totals.totalIn}</span>
              </div>
              <p className="text-xs text-gray-600">Total Stock In</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="w-5 h-5" /><span className="text-xl font-bold">{totals.totalOut}</span>
              </div>
              <p className="text-xs text-gray-600">Total Stock Out</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <Package className="w-5 h-5" /><span className="text-xl font-bold">{totals.currentStock}</span>
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

          <div className="bg-white border rounded-lg overflow-hidden">
            {productSummaries.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                {productSummaries.length} products · {categoryGroups.length} categories · {historyData.length} records
              </div>
            )}

            {/* Mobile */}
            <div className="block md:hidden divide-y">
              {categoryGroups.map(group => (
                <div key={group.categoryName}>
                  <button onClick={() => toggleCategory(group.categoryName)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 font-semibold text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      {collapsedCategories.has(group.categoryName) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {group.categoryName} <span className="text-gray-500 font-normal">({group.summaries.length})</span>
                    </div>
                    <span className="text-blue-600">{group.currentStock}</span>
                  </button>
                  {!collapsedCategories.has(group.categoryName) && group.summaries.map(s => (
                    <div key={s.productId} className="p-4 border-b last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm">{s.productName}</div>
                          <div className="text-xs text-gray-500">SKU: {s.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">{s.currentStock} {s.unitOfMeasure}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        <div className="bg-green-50 rounded p-1"><div className="text-green-600 font-semibold">+{s.totalIn}</div><div className="text-xs text-gray-500">In</div></div>
                        <div className="bg-red-50 rounded p-1"><div className="text-red-600 font-semibold">-{s.totalOut}</div><div className="text-xs text-gray-500">Out</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Desktop */}
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
                      <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={() => toggleCategory(group.categoryName)}>
                        <td className="px-4 py-2 font-semibold text-sm text-gray-700" colSpan={2}>
                          <div className="flex items-center gap-2">
                            {collapsedCategories.has(group.categoryName) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {group.categoryName}
                            <span className="text-gray-500 font-normal text-xs">({group.summaries.length})</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-green-600 font-semibold">+{group.totalIn}</td>
                        <td className="px-4 py-2 text-right text-sm text-red-600 font-semibold">-{group.totalOut}</td>
                        <td className="px-4 py-2 text-right text-sm text-blue-600 font-semibold">{group.currentStock}</td>
                        <td className="px-4 py-2 text-right text-sm">{group.totalValueIn > 0 ? `₹${group.totalValueIn.toLocaleString()}` : '-'}</td>
                      </tr>
                      {!collapsedCategories.has(group.categoryName) && group.summaries.map(s => (
                        <tr key={s.productId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm pl-10">{s.productName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{s.sku}</td>
                          <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                            {s.totalIn > 0 ? `+${s.totalIn} ${s.unitOfMeasure}` : '-'}
                            {s.stockInCount > 0 && <span className="text-xs text-gray-400 ml-1">({s.stockInCount})</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                            {s.totalOut > 0 ? `-${s.totalOut} ${s.unitOfMeasure}` : '-'}
                            {s.stockOutCount > 0 && <span className="text-xs text-gray-400 ml-1">({s.stockOutCount})</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">{s.currentStock} {s.unitOfMeasure}</td>
                          <td className="px-4 py-3 text-right text-sm">{s.totalValueIn > 0 ? `₹${s.totalValueIn.toLocaleString()}` : '-'}</td>
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
                No stock movements found{dateRange !== 'all' ? ` for ${getDateRangeLabel()}` : ''}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
