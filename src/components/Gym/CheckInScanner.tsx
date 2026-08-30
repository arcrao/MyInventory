import React, { useState, useRef, useEffect } from 'react';
import { QrCode, LogIn, LogOut, AlertCircle, Users } from 'lucide-react';
import { GymScanResult } from '../../types';
import { StorageService } from '../../services/storage.service';
import { QrScanner } from './QrScanner';

interface CheckInScannerProps {
  activeCount: number;
  onScanComplete: () => void;
}

const RESUME_DELAY_MS = 2500;

export const CheckInScanner: React.FC<CheckInScannerProps> = ({ activeCount, onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<GymScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) {
        clearTimeout(resumeTimer.current);
      }
    };
  }, []);

  const startScanning = () => {
    setResult(null);
    setError(null);
    setScanning(true);
  };

  const stopScanning = () => {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    if (processing) return;

    setProcessing(true);
    setScanning(false);
    setError(null);

    try {
      const scanResult = await StorageService.scanGymQrCode(decodedText.trim());
      setResult(scanResult);
      onScanComplete();
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
    } finally {
      setProcessing(false);
      resumeTimer.current = setTimeout(() => {
        setResult(null);
        setError(null);
        setScanning(true);
      }, RESUME_DELAY_MS);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Scan Member QR Code
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
          <Users className="w-4 h-4" />
          {activeCount} checked in
        </div>
      </div>

      {!scanning && !processing && (
        <div className="text-center py-10">
          <button
            onClick={startScanning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto min-h-[44px]"
          >
            <QrCode className="w-5 h-5" />
            Start Scanning
          </button>
          <p className="text-sm text-gray-500 mt-3">Point the camera at a member's QR code</p>
        </div>
      )}

      {scanning && (
        <div>
          <QrScanner active={scanning} onScan={handleScan} />
          <div className="text-center mt-3">
            <button
              onClick={stopScanning}
              className="text-gray-600 hover:text-gray-800 text-sm underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {processing && (
        <div className="text-center py-10 text-gray-500">Processing scan...</div>
      )}

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg border-2 flex items-center gap-3 ${
            result.action === 'checked_in'
              ? 'bg-green-50 border-green-400 text-green-800'
              : 'bg-orange-50 border-orange-400 text-orange-800'
          }`}
        >
          {result.action === 'checked_in' ? (
            <LogIn className="w-6 h-6 flex-shrink-0" />
          ) : (
            <LogOut className="w-6 h-6 flex-shrink-0" />
          )}
          <div>
            <div className="font-semibold">
              {result.memberName} {result.action === 'checked_in' ? 'checked in' : 'checked out'}
            </div>
            <div className="text-sm opacity-80">
              {result.memberCode} &middot; {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-lg border-2 bg-red-50 border-red-400 text-red-800 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div className="font-medium">{error}</div>
        </div>
      )}
    </div>
  );
};
