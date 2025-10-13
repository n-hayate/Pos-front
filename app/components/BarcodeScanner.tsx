'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode, Html5QrcodeCameraScanConfig, QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode';

// (インターフェース定義は同じなので省略)
interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}


export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerInitializing = useRef(false);

  useEffect(() => {
    if (scannerInitializing.current) return;
    scannerInitializing.current = true;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const qrCodeScanner = new Html5Qrcode('reader', { verbose: false });
      scannerRef.current = qrCodeScanner;
      
      // (config や callback 関数は同じなので省略)
      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };
      const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText) => { /* ... */ };
      const qrCodeErrorCallback: QrcodeErrorCallback = (errorMessage) => { /* ... */ };


      const startScanner = async () => {
        // (startScannerの中身は前回と同じなので省略)
        if (!scannerRef.current) return;
        // 戦略1
        try {
          await scannerRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, qrCodeErrorCallback);
          console.log("Strategy 1 success");
          return;
        } catch (err) {
          console.warn("Strategy 1 failed", err);
        }
        // 戦略2
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const rearCamera = cameras.find(c => c.label.toLowerCase().includes('back'));
            const cameraIdToUse = rearCamera ? rearCamera.id : cameras[cameras.length - 1].id;
            await scannerRef.current.start(cameraIdToUse, config, qrCodeSuccessCallback, qrCodeErrorCallback);
            console.log("Strategy 2 success");
            return;
          }
        } catch (err) {
          console.error("Strategy 2 failed", err);
        }
        alert("カメラの起動に失敗しました。");
        onClose();
      };

      // **【変更点】**
      // コンポーネントが描画されてから一呼吸おくことで、デバイス認識の安定性を狙う
      const timer = setTimeout(() => {
        startScanner();
      }, 300); // 300ミリ秒待機

      // クリーンアップ関数でタイマーをクリア
      return () => clearTimeout(timer);

    }).catch(err => {
      console.error("Failed to load library", err);
      scannerInitializing.current = false;
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Cleanup failed.", err));
      }
      scannerInitializing.current = false;
    };
  }, [onScan, onClose]);

  // (JSXは同じなので省略)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
       {/* ... */}
    </div>
  );
}