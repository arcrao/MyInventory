import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Product } from '../../types';

interface StockAdjustmentData {
  quantity: number;
  notes: string;
  contactPerson?: string;
  pricePerUnit?: number;
  date: string;
}

interface StockAdjustmentModalProps {
  product: Product;
  onAdjust: (productId: number, action: 'stock_in' | 'stock_out', data: StockAdjustmentData) => void;
  onCancel: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  onAdjust,
  onCancel,
}) => {
  const [action, setAction] = useState<'stock_in' | 'stock_out'>('stock_in');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<number>(product.price);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    if (quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (action === 'stock_out' && quantity > product.quantity) {
      alert(`Cannot remove ${quantity} items. Only ${product.quantity} available in stock.`);
      return;
    }

    if (!contactPerson.trim()) {
      const label = action === 'stock_in' ? 'who received the stock' : 'who the stock was issued to';
      alert(`Please enter ${label}`);
      return;
    }

    const adjustmentData: StockAdjustmentData = {
      quantity,
      notes,
      date,
      contactPerson,
      ...(action === 'stock_in' && { pricePerUnit }),
    };

    onAdjust(product.id, action, adjustmentData);
  };

  const newQuantity = action === 'stock_in'
    ? product.quantity + quantity
    : product.quantity - quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Adjust Stock</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600">Product: <span className="font-medium text-gray-900">{product.name}</span></p>
          <p className="text-sm text-gray-600">Current Stock: <span className="font-medium text-gray-900">{product.quantity} {product.unitOfMeasure}</span></p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Action Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAction('stock_in')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded border-2 transition-colors ${
                action === 'stock_in'
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Stock In</span>
            </button>
            <button
              type="button"
              onClick={() => setAction('stock_out')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded border-2 transition-colors ${
                action === 'stock_out'
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              <span className="font-medium">Stock Out</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Quantity {action === 'stock_in' ? 'to Add' : 'to Remove'} *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className={action === 'stock_in' ? 'grid grid-cols-2 gap-4 mb-4' : 'mb-4'}>
          <div>
            <label className="block text-sm font-medium mb-1">
              {action === 'stock_in' ? 'Received By' : 'Issued To'} *
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder={action === 'stock_in' ? 'Enter person name' : 'Enter person/department name'}
            />
          </div>

          {action === 'stock_in' && (
            <div>
              <label className="block text-sm font-medium mb-1">Price per Unit *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter price"
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="e.g., Purchase order #1234, Customer order, Damaged goods, etc."
          />
        </div>

        {quantity > 0 && (
          <div className={`mb-4 p-3 rounded ${
            action === 'stock_in' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-sm font-medium">
              New Stock Level: <span className={action === 'stock_in' ? 'text-green-700' : 'text-red-700'}>
                {newQuantity} {product.unitOfMeasure}
              </span>
            </p>
            {action === 'stock_in' && pricePerUnit > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Total Cost: ${(quantity * pricePerUnit).toFixed(2)}
              </p>
            )}
            {newQuantity <= product.minStock && (
              <p className="text-xs text-orange-600 mt-1">⚠️ Warning: Stock will be at or below minimum level</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className={`flex-1 text-white px-4 py-2 rounded transition-colors ${
              action === 'stock_in'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {action === 'stock_in' ? 'Add Stock' : 'Remove Stock'}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
