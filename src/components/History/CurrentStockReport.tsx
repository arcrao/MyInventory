import React, { useState, useEffect, useMemo } from 'react';
import { Download, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { StorageService } from '../../services/storage.service';

interface StockItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
  categoryId: string;
  categoryName: string;
}

interface CategoryGroup {
  categoryName: string;
  items: StockItem[];
  totalQuantity: number;
}

export const CurrentStockReport: React.FC = () => {
  const [allProducts, setAllProducts] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [excludeZero, setExcludeZero] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getAllProductsWithCategories();
        setAllProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return excludeZero ? allProducts.filter(p => p.quantity > 0) : allProducts;
  }, [allProducts, excludeZero]);

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groupMap = new Map<string, CategoryGroup>();

    filteredProducts.forEach(product => {
      const key = product.categoryName;
      if (!groupMap.has(key)) {
        groupMap.set(key, { categoryName: key, items: [], totalQuantity: 0 });
      }
      const group = groupMap.get(key)!;
      group.items.push(product);
      group.totalQuantity += product.quantity;
    });

    return Array.from(groupMap.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [filteredProducts]);

  const totalQuantity = useMemo(() => filteredProducts.reduce((s, p) => s + p.quantity, 0), [filteredProducts]);

  const toggleCategory = (name: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleExport = () => {
    if (filteredProducts.length === 0) return;
    setIsExporting(true);
    try {
      const rows: string[][] = [];
      categoryGroups.forEach(group => {
        rows.push([group.categoryName.toUpperCase(), '', '', '']);
        group.items.forEach(p => {
          rows.push([p.name, p.sku, p.quantity.toString(), p.unitOfMeasure]);
        });
        rows.push(['', 'Category Total', group.totalQuantity.toString(), '']);
        rows.push([]);
      });
      rows.push(['GRAND TOTAL', '', totalQuantity.toString(), '']);

      const csvContent = [
        `Current Stock Report`,
        `Generated: ${new Date().toLocaleString()}`,
        excludeZero ? 'Excludes zero-stock products' : 'Includes all products',
        '',
        ['Product Name', 'SKU', 'Quantity', 'Unit'].join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `current_stock_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (error) {
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h2 className="text-xl sm:text-2xl font-bold">Current Stock Report</h2>
          {filteredProducts.length > 0 && (
            <button onClick={handleExport} disabled={isExporting}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400 text-sm min-h-[44px] w-full sm:w-auto justify-center">
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={excludeZero} onChange={(e) => setExcludeZero(e.target.checked)} className="w-4 h-4" />
          Exclude zero-stock products
        </label>
      </div>

      {loading && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading stock report...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-blue-600 mb-1">{filteredProducts.length}</div>
              <p className="text-xs text-gray-600">Products</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <Package className="w-5 h-5" />
                <span className="text-xl font-bold">{totalQuantity}</span>
              </div>
              <p className="text-xs text-gray-600">Total Quantity</p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-purple-600 mb-1">{categoryGroups.length}</div>
              <p className="text-xs text-gray-600">Categories</p>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            {filteredProducts.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                {filteredProducts.length} products across {categoryGroups.length} categories
                {excludeZero && <span className="ml-2 text-orange-600">(zero-stock excluded)</span>}
              </div>
            )}

            {/* Mobile View */}
            <div className="block md:hidden divide-y">
              {categoryGroups.map(group => (
                <div key={group.categoryName}>
                  <button onClick={() => toggleCategory(group.categoryName)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 font-semibold text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      {collapsedCategories.has(group.categoryName) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {group.categoryName}
                      <span className="text-gray-500 font-normal">({group.items.length})</span>
                    </div>
                    <span className="text-blue-600 font-bold">{group.totalQuantity}</span>
                  </button>
                  {!collapsedCategories.has(group.categoryName) && group.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center px-4 py-3 border-b last:border-b-0">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                      </div>
                      <div className={`font-bold text-sm ${item.quantity === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                        {item.quantity} {item.unitOfMeasure}
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
                    <th className="px-4 py-3 text-right text-sm font-medium text-blue-600">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categoryGroups.map(group => (
                    <React.Fragment key={group.categoryName}>
                      <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200"
                        onClick={() => toggleCategory(group.categoryName)}>
                        <td className="px-4 py-2 font-semibold text-sm text-gray-700" colSpan={2}>
                          <div className="flex items-center gap-2">
                            {collapsedCategories.has(group.categoryName) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {group.categoryName}
                            <span className="text-gray-500 font-normal text-xs">({group.items.length} products)</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-blue-600 font-semibold">{group.totalQuantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-400">—</td>
                      </tr>
                      {!collapsedCategories.has(group.categoryName) && group.items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm pl-10">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.sku}</td>
                          <td className={`px-4 py-3 text-right text-sm font-bold ${item.quantity === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.unitOfMeasure}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold border-t-2">
                  <tr>
                    <td className="px-4 py-3 text-sm" colSpan={2}>GRAND TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">{totalQuantity}</td>
                    <td className="px-4 py-3 text-sm"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No products found{excludeZero ? ' with stock above zero' : ''}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
