import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Category, Location, Product } from '../../types';

interface SettingsViewProps {
  categories: Category[];
  locations: Location[];
  products: Product[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddLocation: (name: string) => void;
  onDeleteLocation: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  categories,
  locations,
  products,
  onAddCategory,
  onDeleteCategory,
  onAddLocation,
  onDeleteLocation,
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory);
      setNewCategory('');
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (products.some((p) => p.categoryId === id)) {
      alert('Cannot delete category that has products assigned to it.');
      return;
    }
    onDeleteCategory(id);
  };

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      onAddLocation(newLocation);
      setNewLocation('');
    }
  };

  const handleDeleteLocation = (id: string) => {
    if (products.some((p) => p.locationId === id)) {
      alert('Cannot delete location that has products assigned to it.');
      return;
    }
    onDeleteLocation(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Categories</h2>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1 border rounded px-3 py-2"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <span>{cat.name}</span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Locations</h2>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="New location name"
              className="flex-1 border rounded px-3 py-2"
              onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
            />
            <button
              onClick={handleAddLocation}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <span>{loc.name}</span>
                <button
                  onClick={() => handleDeleteLocation(loc.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
