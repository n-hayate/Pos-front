'use client';

import { useEffect, useRef } from 'react';
// Html5Qrcodeの型を明確にインポートします
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // useEffectのクリーンアップが複数回実行されるのを防ぐためのフラグ
  const cleanupCalled = useRef(false);

  useEffect(() => {
    // 既にインスタンスが存在する場合は処理をスキップ
    if (scannerRef.current) {
      return;
    }

    // ライブラリを動的にインポート
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      // コンポーネントが既にアンマウントされていたら何もしない
      if (cleanupCalled.current) {
        return;
      }
      
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      const startScanner = async () => {
        try {
          // scannerRef.current がnullでないことを確認
          if (!scannerRef.current) return;

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // スキャン成功時の処理
              // スキャナがアクティブな状態か確認してから停止処理を行う
              if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                 onScan(decodedText);
              }
            },
            (errorMessage) => { /* 読み取り中のエラーは無視 */ }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "カメラの起動に失敗しました。";
          alert(`カメラエラー: ${message}\n\nお使いのブラウザで、このサイトのカメラへのアクセスが許可されているか確認してください。\nまた、サイトはHTTPSでのアクセスが必要です。`);
          onClose();
        }
      };

      startScanner();
    });

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      cleanupCalled.current = true;
      const scanner = scannerRef.current;
      if (scanner) {
        // isScanning状態に関わらず、インスタンスが存在すれば停止を試みる
        scanner.stop()
          .then(() => {
            console.log("スキャナを正常に停止しました。");
            // clear()を呼び出してリソースを完全に解放
            scanner.clear();
          })
          .catch(err => {
            console.error("スキャナの停止またはクリアに失敗しました。", err);
          })
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列は空のままにします

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
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