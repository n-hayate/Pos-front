'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode, Html5QrcodeCameraScanConfig, QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerInitializing = useRef(false);

  useEffect(() => {
    if (scannerInitializing.current) {
      return;
    }
    scannerInitializing.current = true;

    // パッケージ名で動的インポート
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const qrCodeScanner = new Html5Qrcode('reader', { verbose: false });
      scannerRef.current = qrCodeScanner;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText) => {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => onScan(decodedText))
            .catch(err => {
              console.error("Scanner stop failed, but proceeding...", err);
              onScan(decodedText);
            });
        }
      };

      const qrCodeErrorCallback: QrcodeErrorCallback = (errorMessage) => {
        // エラーは無視
      };

      const startScanner = async () => {
        if (!scannerRef.current) return;

        // **戦略1： まずは facingMode: "environment" で試す**
        try {
          await scannerRef.current.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
          console.log("Strategy 1: Started successfully with facingMode.");
          return; // 成功したらここで終了
        } catch (err) {
          console.warn("Strategy 1 failed: Could not start with facingMode.", err);
          // 失敗した場合、戦略2に進む
        }

        // **戦略2： カメラリストを取得し、「背面」カメラをIDで直接指定する**
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            // "back", "environment", "背面" などのキーワードで背面カメラを探す
            const rearCamera = cameras.find(camera => 
              camera.label.toLowerCase().includes('back') || 
              camera.label.toLowerCase().includes('environment') ||
              camera.label.includes('背面')
            );
            
            let cameraIdToUse = null;

            if (rearCamera) {
              cameraIdToUse = rearCamera.id;
              console.log("Strategy 2: Found rear camera by label:", rearCamera.label);
            } else if (cameras.length > 1) {
              // ラベルで見つからない場合の最後の手段として、リストの最後のカメラを選択
              cameraIdToUse = cameras[cameras.length - 1].id;
              console.log("Strategy 2: Could not find by label, falling back to the last camera in the list.");
            } else {
              // カメラが1つしかない場合はそれを使う
              cameraIdToUse = cameras[0].id;
            }

            if (cameraIdToUse) {
              await scannerRef.current.start(
                cameraIdToUse,
                config,
                qrCodeSuccessCallback,
                qrCodeErrorCallback
              );
              console.log("Strategy 2: Started successfully with specific camera ID.");
              return;
            }
          }
        } catch (err) {
            console.error("Strategy 2 failed: Could not get cameras or start with specific ID.", err);
        }

        // 全ての戦略が失敗した場合
        alert("カメラの起動に失敗しました。サイトにカメラのアクセス許可が与えられているか確認してください。");
        onClose();
      };

      startScanner();

    }).catch(err => {
      console.error("Failed to load html5-qrcode library.", err);
      scannerInitializing.current = false;
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Cleanup failed.", err));
      }
      scannerInitializing.current = false;
    };
  }, [onScan, onClose]);

  // JSX は変更なし
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 border-2 border-gray-300 bg-gray-100">
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