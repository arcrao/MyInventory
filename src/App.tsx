import React, { useState } from 'react';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ProductsList } from './components/Products/ProductsList';
import { ProductDetail } from './components/Products/ProductDetail';
import { ProductForm } from './components/Products/ProductForm';
import { StockAdjustmentModal } from './components/Products/StockAdjustmentModal';
import { HistoryView } from './components/History/HistoryView';
import { ProductTimelineReport } from './components/History/ProductTimelineReport';
import { CurrentStockReport } from './components/History/CurrentStockReport';
import { SettingsView } from './components/Settings/SettingsView';
import { FireExtinguishersList } from './components/FireExtinguishers/FireExtinguishersList';
import { AuthForm } from './components/Auth/AuthForm';
import { useAuth } from './contexts/AuthContext';
import { useProducts } from './hooks/useProducts';
import { useCategories } from './hooks/useCategories';
import { useLocations } from './hooks/useLocations';
import { useHistory } from './hooks/useHistory';
import { useFireExtinguishers } from './hooks/useFireExtinguishers';
import { Product, TabType } from './types';

// Separate component for authenticated app to ensure clean remount on auth changes
type HistoryViewType = 'all' | 'timeline' | 'current_stock';

const AuthenticatedApp: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [historyViewType, setHistoryViewType] = useState<HistoryViewType>('all');

  const {
    history,
    currentPage: historyPage,
    totalPages: historyTotalPages,
    totalCount: historyTotalCount,
    filters: historyFilters,
    applyFilters: applyHistoryFilters,
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
    filters,
    applyFilters,
    reloadProducts,
  } = useProducts(user);
  const { categories, addCategory, deleteCategory } = useCategories(user);
  const { locations, addLocation, deleteLocation } = useLocations(user);
  const {
    extinguishers,
    summary: extinguisherSummary,
    areas: extinguisherAreas,
    addExtinguisher,
    updateExtinguisher,
    deleteExtinguisher,
    currentPage: extinguisherPage,
    totalPages: extinguisherTotalPages,
    totalCount: extinguisherTotalCount,
    pageSize: extinguisherPageSize,
    loading: extinguishersLoading,
    goToPage: goToExtinguisherPage,
    filters: extinguisherFilters,
    applyFilters: applyExtinguisherFilters,
    sort: extinguisherSort,
    applySort: applyExtinguisherSort,
    reloadExtinguishers,
  } = useFireExtinguishers(user);

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

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
    setActiveTab('products'); // Switch to products tab when viewing a product
  };

  const handleBackFromProductDetail = () => {
    setViewingProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${
              activeTab === 'products' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('extinguishers')}
            className={`px-4 py-2.5 rounded whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${
              activeTab === 'extinguishers' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Fire Extinguishers
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${
              activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            categories={categories}
            onViewProduct={handleViewProduct}
          />
        )}
        {activeTab === 'products' && !viewingProduct && (
          <ProductsList
            products={products}
            categories={categories}
            locations={locations}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={deleteProduct}
            onStockAdjust={handleStockAdjust}
            onViewProduct={handleViewProduct}
            onProductAdd={addProduct}
            onReloadProducts={reloadProducts}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={goToPage}
            currentFilters={filters}
            onFilterChange={applyFilters}
          />
        )}
        {activeTab === 'products' && viewingProduct && (
          <ProductDetail
            product={viewingProduct}
            categories={categories}
            locations={locations}
            onBack={handleBackFromProductDetail}
          />
        )}
        {activeTab === 'history' && (
          <div>
            {/* History View Type Toggle */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'timeline', 'current_stock'] as HistoryViewType[]).map((type) => (
                <button key={type}
                  onClick={() => setHistoryViewType(type)}
                  className={`px-4 py-2 rounded text-sm font-medium min-h-[40px] transition-colors ${
                    historyViewType === type
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type === 'all' ? 'All History' : type === 'timeline' ? 'Stock Movement' : 'Current Stock'}
                </button>
              ))}
            </div>

            {historyViewType === 'all' && (
              <HistoryView
                history={history}
                products={products}
                currentPage={historyPage}
                totalPages={historyTotalPages}
                totalCount={historyTotalCount}
                filters={historyFilters}
                onFilterChange={applyHistoryFilters}
                onPageChange={goToHistoryPage}
              />
            )}
            {historyViewType === 'timeline' && <ProductTimelineReport />}
            {historyViewType === 'current_stock' && <CurrentStockReport />}
          </div>
        )}
        {activeTab === 'extinguishers' && (
          <FireExtinguishersList
            extinguishers={extinguishers}
            summary={extinguisherSummary}
            areas={extinguisherAreas}
            filters={extinguisherFilters}
            sort={extinguisherSort}
            currentPage={extinguisherPage}
            totalPages={extinguisherTotalPages}
            totalCount={extinguisherTotalCount}
            pageSize={extinguisherPageSize}
            loading={extinguishersLoading}
            onFilterChange={applyExtinguisherFilters}
            onSortChange={applyExtinguisherSort}
            onPageChange={goToExtinguisherPage}
            onAdd={addExtinguisher}
            onUpdate={updateExtinguisher}
            onDelete={deleteExtinguisher}
            onReload={reloadExtinguishers}
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

// Main App component that handles authentication routing
const App: React.FC = () => {
  const { user, loading } = useAuth();

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

  // Extra safety check - prevents dashboard from showing without valid auth
  if (!user.id || !user.email) {
    return <AuthForm />;
  }

  // Render authenticated app with key to force remount on user change
  // This ensures hooks are properly reset when switching between auth methods
  return <AuthenticatedApp key={user.id} user={user} />;
};

export default App;
