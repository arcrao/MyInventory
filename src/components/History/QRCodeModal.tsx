import React from 'react';
import QRCode from 'react-qr-code';
import { X, Download } from 'lucide-react';
import { HistoryEntry, Product } from '../../types';
import { getProductName } from '../../utils/helpers';

interface QRCodeModalProps {
  entry: HistoryEntry;
  products: Product[];
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ entry, products, onClose }) => {
  const productName = getProductName(products, entry.productId);
  const product = products.find(p => p.id === entry.productId);

  // Generate QR code data
  const qrData = JSON.stringify({
    transactionId: entry.id,
    action: entry.action,
    product: productName,
    sku: product?.sku || 'N/A',
    quantity: entry.quantity,
    date: entry.date || new Date(entry.timestamp).toLocaleDateString(),
    timestamp: entry.timestamp,
    ...(entry.contactPerson && {
      [entry.action === 'stock_in' ? 'receivedBy' : 'issuedTo']: entry.contactPerson,
    }),
    ...(entry.action === 'stock_in' && {
      pricePerUnit: entry.pricePerUnit,
      totalCost: entry.pricePerUnit && entry.quantity
        ? (entry.pricePerUnit * entry.quantity).toFixed(2)
        : undefined,
    }),
    notes: entry.notes,
  });

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${entry.action}-${entry.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Transaction QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Product:</span> {productName}</p>
              <p><span className="font-medium">SKU:</span> {product?.sku || 'N/A'}</p>
              <p><span className="font-medium">Action:</span> {entry.action.replace('_', ' ')}</p>
              <p><span className="font-medium">Quantity:</span> {entry.quantity}</p>
              <p><span className="font-medium">Date:</span> {entry.date || new Date(entry.timestamp).toLocaleDateString()}</p>
              {entry.contactPerson && (
                <p>
                  <span className="font-medium">
                    {entry.action === 'stock_in' ? 'Received By:' : 'Issued To:'}
                  </span> {entry.contactPerson}
                </p>
              )}
              {entry.action === 'stock_in' && entry.pricePerUnit !== undefined && (
                <>
                  <p><span className="font-medium">Price/Unit:</span> ₹{entry.pricePerUnit.toFixed(2)}</p>
                  <p><span className="font-medium">Total Cost:</span> ₹{(entry.pricePerUnit * entry.quantity).toFixed(2)}</p>
                </>
              )}
              {entry.notes && <p><span className="font-medium">Notes:</span> {entry.notes}</p>}
            </div>
          </div>

          <div className="flex justify-center bg-white p-6 rounded-lg border-2 border-gray-200">
            <QRCode
              id="qr-code-svg"
              value={qrData}
              size={256}
              level="H"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download QR Code
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
