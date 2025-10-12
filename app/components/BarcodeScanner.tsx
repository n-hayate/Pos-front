'use client';

import { useEffect, useRef } from 'react';
// Html5Qrcodeを直接インポートして型として利用
import type { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  // スキャナーインスタンスの型を明示的に指定
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // ライブラリを動的にインポート
    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      
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

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      const qrCodeSuccessCallback = (decodedText: string) => {
        if (qrCode && qrCode.isScanning) {
          qrCode.stop().then(() => {
            onScan(decodedText);
          }).catch((err: unknown) => {
            console.error("Failed to stop scanner after success.", err);
            onScan(decodedText);
          });
        }
      };

      const qrCodeErrorCallback = (errorMessage: string) => {
        // スキャンエラーは無視
      };

      const startScanning = async () => {
        if (!qrCode) return;

        try {
          // 1. 利用可能なカメラのリストを取得
          const cameras = await Html5Qrcode.getCameras();

          if (cameras && cameras.length) {
            let cameraId: string | undefined = undefined;

            // 2. 背面カメラ（'back' or 'environment'）を探す
            const rearCamera = cameras.find(camera => 
              camera.label.toLowerCase().includes('back') || 
              (camera as any).facing === 'environment'
            );

            if (rearCamera) {
              cameraId = rearCamera.id;
              console.log(`Using rear camera: ${rearCamera.label}`);
            } else {
              // 3. 背面カメラがなければ、リストの最初のカメラを使用
              cameraId = cameras[0].id;
              console.log(`Rear camera not found. Using default camera: ${cameras[0].label}`);
            }

            // 4. 特定したカメラIDでスキャンを開始
            await qrCode.start(
              cameraId,
              config,
              qrCodeSuccessCallback,
              qrCodeErrorCallback
            );

          } else {
            // カメラが見つからない場合、デフォルト設定で試す（最終手段）
            await qrCode.start(
              {}, // ← 修正箇所: undefined から {} へ変更
              config, 
              qrCodeSuccessCallback, 
              qrCodeErrorCallback
            );
          }
        } catch (err: unknown) {
          console.error("Failed to start camera.", err);
          onClose();
        }
      };

      startScanning();

    }).catch((err: unknown) => {
      console.error("Failed to load html5-qrcode library", err);
    });

    // クリーンアップ
    return () => {
      const qrCode = scannerRef.current;
      if (qrCode && qrCode.isScanning) {
        qrCode.stop().catch((err: unknown) => console.error("Failed to stop scanner on cleanup.", err));
      }
    };
  }, [onScan, onClose]);

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