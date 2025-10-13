'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  // useEffectの2回実行を防ぐための useRef。Strict Mode対策として有効です。
  const scannerInitialized = useRef(false);

  useEffect(() => {
    if (scannerInitialized.current) {
      return;
    }
    scannerInitialized.current = true;

    let html5QrCode: Html5Qrcode | undefined;

    const setupAndStartScanner = async () => {
      try {
        // ライブラリを動的にインポート
        const { Html5Qrcode } = await import('html5-qrcode');

        const scannerElement = document.getElementById('reader');
        if (!scannerElement) {
          throw new Error("スキャナ用のDOM要素 '#reader' が見つかりません。");
        }

        html5QrCode = new Html5Qrcode(scannerElement.id);

        // 💡【修正点】カメラIDを自前で探すのをやめ、facingModeで背面カメラを直接指定する
        await html5QrCode.start(
          { facingMode: "environment" }, // "environment" は背面カメラを指す標準的な方法
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0, // UIと合わせるためアスペクト比を1:1に設定するとより安定します
          },
          (decodedText) => {
            // スキャン成功時の処理
            if (html5QrCode?.isScanning) {
              html5QrCode.stop().then(() => onScan(decodedText)).catch(err => {
                  console.error("スキャナの停止に失敗しましたが、結果を処理します。", err);
                  onScan(decodedText);
              });
            }
          },
          (errorMessage) => { 
            // QRコード/バーコードが認識できないフレーム毎のエラーは無視
          }
        );

      } catch (err) {
        console.error("カメラのセットアップ中に致命的なエラーが発生:", err);
        const message = err instanceof Error ? err.message : "カメラの起動に失敗しました。";
        // ユーザーに分かりやすいエラーメッセージを表示
        alert(`カメラの起動に失敗しました。\n\nお手数ですが、サイトにカメラのアクセス許可が与えられているか設定をご確認ください。`);
        onClose();
      }
    };

    setupAndStartScanner();

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(err => {
          console.error("クリーンアップ中のスキャナ停止に失敗", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、初回マウント時のみ実行されるようにする

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        {/* スキャナが表示される領域 */}
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