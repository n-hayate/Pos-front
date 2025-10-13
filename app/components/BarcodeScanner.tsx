'use client';

import { useEffect, useRef } from 'react';
// The 'html5-qrcode' library will be imported dynamically and does not need to be installed via npm.
// We can declare the type for better intellisense.
import type { Html5Qrcode, Html5QrcodeCameraScanConfig, QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // A flag to prevent multiple initialization attempts
  const scannerInitializing = useRef(false);

  useEffect(() => {
    if (scannerInitializing.current) {
      return;
    }
    scannerInitializing.current = true;
    // Dynamically import the library from the installed package
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      // The library provides the Html5Qrcode class
      const qrCodeScanner = new Html5Qrcode('reader', {
        verbose: false
      });
      scannerRef.current = qrCodeScanner;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // aspectRatio is often better handled by the browser/library, removing it can improve compatibility
        // aspectRatio: 1.0, 
      };

      // Use the corrected type: QrcodeSuccessCallback
      const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText) => {
        // Stop scanning only if the scanner instance exists and is scanning.
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => onScan(decodedText))
            .catch(err => {
              console.error("Scanner stop failed, but proceeding with scan result.", err);
              onScan(decodedText); // Still call onScan even if stop fails
            });
        }
      };

      // Use the corrected type: QrcodeErrorCallback
      const qrCodeErrorCallback: QrcodeErrorCallback = (errorMessage) => {
        // We can ignore scan errors, they happen continuously.
      };
      
      // ** MODIFICATION START **
      // The previous complex logic (`startRearCameraDirectly`) is replaced with a direct call.
      // We directly ask the library to use the rear camera ('environment').
      // This is the most reliable way to ensure the correct camera starts.
      if (scannerRef.current) {
        scannerRef.current.start(
          { facingMode: "environment" }, // This is the key change
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        ).catch((err) => {
          console.error("Failed to start the scanner.", err);
          // If starting the rear camera fails, you might want to inform the user or try a fallback.
          alert("カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。");
          onClose();
        });
      }
      // ** MODIFICATION END **

    }).catch(err => {
      console.error("Failed to load html5-qrcode library.", err);
      scannerInitializing.current = false;
      alert("スキャナーライブラリの読み込みに失敗しました。");
      onClose();
    });

    // Cleanup function when the component unmounts.
    return () => {
      // Ensure scanner stops when the component is unmounted.
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup.", err));
      }
      scannerInitializing.current = false;
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 border-2 border-gray-300 bg-gray-100">
          {/* The div for the scanner to attach to */}
          <div id="reader" />
        </div>
        <button
          onClick={onClose}
          className="w-full mt-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform active:scale-95"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}