'use client';

import { useEffect, useRef } from 'react';

// NOTE: The 'html5-qrcode' library is imported dynamically inside useEffect
// to prevent server-side rendering errors in Next.js.

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  // The ref will hold the instance of the scanner
  const scannerRef = useRef<any | null>(null);

  useEffect(() => {
    // Dynamically import the library only on the client side
    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      
      // Ensure the scanner is only created once
      if (!scannerRef.current) {
        const html5QrCode = new Html5Qrcode(
          'reader', 
          {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.QR_CODE
            ],
            verbose: false
          }
        );
        scannerRef.current = html5QrCode;
      }
      
      const qrCode = scannerRef.current;
      if (!qrCode || qrCode.isScanning) {
        return;
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      const qrCodeSuccessCallback = (decodedText: string) => {
        if (qrCode && qrCode.isScanning) {
          qrCode.stop().then(() => {
            onScan(decodedText);
          }).catch((err: unknown) => { // ← 修正 (任意ですがこちらも修正)
            console.error("Failed to stop scanner after success.", err);
            onScan(decodedText); // Proceed even if stopping fails
          });
        }
      };

      const qrCodeErrorCallback = (errorMessage: string) => {
        // Ignore scan errors
      };

      // Function to start scanning
      const startScanning = async () => {
        try {
          // First, try to start with the rear camera (environment) for mobile devices
          await qrCode.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } catch (err: unknown) { // ← 修正 (エラー箇所1)
          console.warn("Failed to start with rear camera. Trying default camera.", err);
          // If rear camera fails (e.g., on a PC), try starting with any available camera
          try {
            await qrCode.start(
              undefined, // Use the default camera
              config,
              qrCodeSuccessCallback,
              qrCodeErrorCallback
            );
          } catch (err2: unknown) { // ← 修正 (こちらも同様に)
            console.error("Failed to start any camera.", err2);
            onClose(); // Close the component if no camera can be started
          }
        }
      };

      startScanning();

    }).catch((err: unknown) => { // ← 修正 (任意ですがこちらも修正)
      console.error("Failed to load html5-qrcode library", err);
    });

    // Cleanup function when the component unmounts
    return () => {
      const qrCode = scannerRef.current;
      if (qrCode && qrCode.isScanning) {
        qrCode.stop().catch((err: unknown) => console.error("Failed to stop scanner on cleanup.", err)); // ← 修正 (エラー箇所2)
      }
    };
  }, [onScan, onClose]);

  // UI for the scanner modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 border-2 border-gray-300">
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