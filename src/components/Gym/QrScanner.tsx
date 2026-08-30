import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  active: boolean;
}

const ELEMENT_ID = 'gym-qr-scanner';

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, active }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!stopped) {
            onScanRef.current(decodedText);
          }
        },
        () => {
          // Ignore per-frame "QR code not found" errors - expected while scanning
        }
      )
      .catch((err) => {
        console.error('Error starting QR scanner:', err);
      });

    return () => {
      stopped = true;
      scanner.stop().then(() => scanner.clear()).catch(() => {
        // Scanner may already be stopped/cleared - safe to ignore
      });
      scannerRef.current = null;
    };
  }, [active]);

  return <div id={ELEMENT_ID} className="w-full max-w-sm mx-auto rounded-lg overflow-hidden" />;
};
