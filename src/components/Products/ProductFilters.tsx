import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Category } from '../../types';

interface ProductFiltersProps {
  categories: Category[];
  onFilterChange: (filters: { searchTerm: string; categoryId: string }) => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFilterChange({ searchTerm: value, categoryId });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    onFilterChange({ searchTerm, categoryId: value });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryId('');
    onFilterChange({ searchTerm: '', categoryId: '' });
  };

  const hasActiveFilters = searchTerm || categoryId;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Search by Product Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Filter by Category</label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Search: "{searchTerm}"
              </span>
            )}
            {categoryId && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                Category: {categories.find(c => c.id === categoryId)?.name}
              </span>
            )}
          </div>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
