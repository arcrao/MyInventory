import React from 'react';
import QRCode from 'react-qr-code';
import { X, Download } from 'lucide-react';
import { GymMember } from '../../types';

interface MemberQRModalProps {
  member: GymMember;
  onClose: () => void;
}

export const MemberQRModal: React.FC<MemberQRModalProps> = ({ member, onClose }) => {
  const handleDownload = () => {
    const svg = document.getElementById('gym-member-qr-svg');
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
      downloadLink.download = `gym-member-${member.memberCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-md w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 pb-4 border-b flex-shrink-0">
          <h2 className="text-2xl font-bold">Member QR Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm space-y-1">
            <p><span className="font-medium">Name:</span> {member.name}</p>
            <p><span className="font-medium">Member Code:</span> {member.memberCode}</p>
            {member.membershipType && (
              <p><span className="font-medium">Membership:</span> {member.membershipType}</p>
            )}
          </div>

          <div className="flex justify-center bg-white p-6 rounded-lg border-2 border-gray-200">
            <QRCode id="gym-member-qr-svg" value={member.memberCode} size={220} level="H" />
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            Staff scan this code at check-in and check-out.
          </p>
        </div>

        <div className="p-6 pt-0 flex gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Download QR Code
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
