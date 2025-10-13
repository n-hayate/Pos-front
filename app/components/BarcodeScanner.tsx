'use client';

import { useEffect } from 'react';
// html5-qrcodeを直接インポートします
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {

  useEffect(() => {
    // このuseEffect内で完結するスキャナのインスタンスを保持する変数
    let html5QrCode: Html5Qrcode | undefined;

    const startScanner = async () => {
      try {
        // スキャナのインスタンスを新しく生成
        html5QrCode = new Html5Qrcode('reader');
        
        // カメラの起動とスキャン開始
        await html5QrCode.start(
          { facingMode: "environment" }, // 背面カメラを優先
          {
            fps: 10, // スキャン頻度
            qrbox: { width: 250, height: 250 }, // スキャン領域のサイズ
          },
          (decodedText) => {
            // ★★★ スキャンに成功したら、すぐにコールバックを呼ぶ ★★★
            onScan(decodedText);
          },
          (errorMessage) => {
            // 読み取り中のエラーは無視します
          }
        );

      } catch (err) {
        // カメラの起動自体に失敗した場合のエラー処理
        const message = err instanceof Error ? err.message : "不明なエラーです。";
        console.error("カメラ起動エラー:", err);
        alert(`カメラの起動に失敗しました: ${message}\n\nブラウザのカメラアクセス許可を確認してください。\n(このサイトはHTTPS接続である必要があります)`);
        onClose(); // エラー時はスキャナを閉じる
      }
    };

    // コンポーネントがマウントされたらスキャナを開始
    startScanner();

    // クリーンアップ関数: コンポーネントがアンマウントされるときに実行
    return () => {
      // html5QrCodeが起動しており、かつスキャン中であるかを確認
      if (html5QrCode && html5QrCode.isScanning) {
        // stop()はPromiseを返すので、非同期で処理します
        html5QrCode.stop().catch(err => {
          // 停止時にエラーが発生しても、アプリがクラッシュしないようにログ出力に留める
          console.error("スキャナの停止に失敗しました。", err);
        });
      }
    };
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // このEffectはマウント時に一度だけ実行します

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