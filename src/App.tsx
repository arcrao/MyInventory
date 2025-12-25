import React, { useState } from 'react';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ProductsList } from './components/Products/ProductsList';
import { ProductForm } from './components/Products/ProductForm';
import { StockAdjustmentModal } from './components/Products/StockAdjustmentModal';
import { HistoryView } from './components/History/HistoryView';
import { SettingsView } from './components/Settings/SettingsView';
import { AuthForm } from './components/Auth/AuthForm';
import { useAuth } from './contexts/AuthContext';
import { useProducts } from './hooks/useProducts';
import { useCategories } from './hooks/useCategories';
import { useLocations } from './hooks/useLocations';
import { useHistory } from './hooks/useHistory';
import { Product, TabType } from './types';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const {
    history,
    addHistoryEntry,
    currentPage: historyPage,
    totalPages: historyTotalPages,
    totalCount: historyTotalCount,
    searchTerm: historySearchTerm,
    applySearch: applyHistorySearch,
    goToPage: goToHistoryPage,
  } = useHistory(user);
  const {
    products,
    addProduct,
    updateProduct,
    stockIn,
    stockOut,
    deleteProduct,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
    applyFilters,
    reloadProducts,
  } = useProducts(addHistoryEntry, user);
  const { categories, addCategory, deleteCategory } = useCategories(user);
  const { locations, addLocation, deleteLocation } = useLocations(user);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm />;
  }

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

  const handleStockAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setShowStockAdjustment(true);
  };

  const handleStockAdjustmentSubmit = async (
    productId: number,
    action: 'stock_in' | 'stock_out',
    data: any
  ) => {
    if (action === 'stock_in') {
      await stockIn(productId, data);
    } else {
      await stockOut(productId, data);
    }
    setShowStockAdjustment(false);
    setAdjustingProduct(null);
  };

  const handleCancelStockAdjustment = () => {
    setShowStockAdjustment(false);
    setAdjustingProduct(null);
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
            onStockAdjust={handleStockAdjust}
            onProductAdd={addProduct}
            onReloadProducts={reloadProducts}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={goToPage}
            onFilterChange={applyFilters}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView
            history={history}
            products={products}
            currentPage={historyPage}
            totalPages={historyTotalPages}
            totalCount={historyTotalCount}
            searchTerm={historySearchTerm}
            onSearchChange={applyHistorySearch}
            onPageChange={goToHistoryPage}
          />
        )}
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

        {showStockAdjustment && adjustingProduct && (
          <StockAdjustmentModal
            product={adjustingProduct}
            onAdjust={handleStockAdjustmentSubmit}
            onCancel={handleCancelStockAdjustment}
          />
        )}
      </div>
    </div>
  );
};

export default App;
