'use client';

import { useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  useEffect(() => {
    let html5QrCode: Html5Qrcode | undefined;

    const startScanner = async () => {
      try {
        // インスタンスを生成
        html5QrCode = new Html5Qrcode('reader');
        
        await html5QrCode.start(
          { facingMode: "environment" }, // 背面カメラを要求
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // スキャン成功時の処理
            // 成功したらすぐにスキャンを停止し、結果をコールバック
            if (html5QrCode) {
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // 読み取り中のエラーは無視
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "カメラの起動に失敗しました。";
        alert(`カメラエラー: ${message}\n\nお使いのブラウザで、このサイトのカメラへのアクセスが許可されているか確認してください。\nまた、サイトはHTTPSでのアクセスが必要です。`);
        onClose();
      }
    };

    startScanner();

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop()
          .then(() => {
            console.log("スキャナを正常に停止しました。");
            // clear()は不要な場合が多い。stop()で十分
          })
          .catch(err => {
            console.error("スキャナの停止に失敗しました。", err);
          });
      }
    };
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列は空のまま

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        {/* `key`を追加して、再描画時にDOM要素を確実に再生成させる */}
        <div id="reader" key="qr-reader" className="w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100" />
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