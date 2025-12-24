import React, { useState } from 'react';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ProductsList } from './components/Products/ProductsList';
import { ProductForm } from './components/Products/ProductForm';
import { HistoryView } from './components/History/HistoryView';
import { SettingsView } from './components/Settings/SettingsView';
import { useProducts } from './hooks/useProducts';
import { useCategories } from './hooks/useCategories';
import { useLocations } from './hooks/useLocations';
import { useHistory } from './hooks/useHistory';
import { Product, TabType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { history, addHistoryEntry } = useHistory();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts(addHistoryEntry);
  const { categories, addCategory, deleteCategory } = useCategories();
  const { locations, addLocation, deleteLocation } = useLocations();

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleSaveProduct = async (productData: any) => {
    if (editingProduct) {
      await updateProduct(productData);
    } else {
      await addProduct(productData);
    }
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleCancelForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'products' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'dashboard' && <Dashboard products={products} categories={categories} />}
        {activeTab === 'products' && (
          <ProductsList
            products={products}
            categories={categories}
            locations={locations}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={deleteProduct}
          />
        )}
        {activeTab === 'history' && <HistoryView history={history} products={products} />}
        {activeTab === 'settings' && (
          <SettingsView
            categories={categories}
            locations={locations}
            products={products}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            onAddLocation={addLocation}
            onDeleteLocation={deleteLocation}
          />
        )}

        {showProductForm && (
          <ProductForm
            product={editingProduct}
            categories={categories}
            locations={locations}
            onSave={handleSaveProduct}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </div>
  );
};

export default App;
