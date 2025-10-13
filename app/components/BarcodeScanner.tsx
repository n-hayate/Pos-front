'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // ライブラリを動的にインポート
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      const startScanner = async () => {
        try {
          // 利用可能なカメラを取得
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            throw new Error("カメラが見つかりません。");
          }

          // 背面カメラを優先的に選択 (ラベルに "back" や "背面" が含まれるものを探す)
          const rearCamera = devices.find(device => /back|背面/.test(device.label.toLowerCase()));
          const cameraId = rearCamera ? rearCamera.id : devices[0].id; // 見つからなければ最初のカメラ

          // スキャナを開始
          await scanner.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // スキャン成功時の処理
              if (scannerRef.current?.isScanning) {
                scannerRef.current.stop()
                  .then(() => onScan(decodedText))
                  .catch(err => console.error("スキャナ停止失敗", err));
              }
            },
            (errorMessage) => { /* 読み取り中のエラーは無視 */ }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "カメラの起動に失敗しました。";
          alert(`カメラエラー: ${message}\nサイトのカメラ権限を許可してください。`);
          onClose();
        }
      };

      startScanner();
    });

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("クリーンアップ中のスキャナ停止に失敗", err);
        });
      }
    };
  }, [onClose, onScan]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        {/* スキャナが表示されるためのdiv要素 */}
        <div id="reader" className="w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100" />
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors transform active:scale-95"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}