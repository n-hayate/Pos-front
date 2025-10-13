'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  // useEffectが複数回実行されるのを防ぐためのフラグ
  const isComponentMounted = useRef(false);

  useEffect(() => {
    // 開発モードのStrict Modeによる二重実行に対応
    if (isComponentMounted.current) {
      return;
    }
    isComponentMounted.current = true;

    // スキャナのインスタンスを格納する変数
    let html5QrCode: Html5Qrcode | undefined;

    const setupScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        
        // ① 最初にカメラ権限を取得し、デバイスリストを得る
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error("カメラが見つかりません。");
        }

        // ② 背面カメラを特定するロジック (より堅牢に)
        const rearCamera = cameras.find(camera => /back|背面/.test(camera.label.toLowerCase()));
        const cameraId = rearCamera ? rearCamera.id : cameras[cameras.length - 1].id;

        // ③ スキャナを生成し、DOMに紐付ける
        const scannerElement = document.getElementById('reader');
        if (!scannerElement) {
          throw new Error("スキャナ用のDOM要素が見つかりません。");
        }
        html5QrCode = new Html5Qrcode(scannerElement.id);

        // ④ 特定したカメラIDでスキャンを開始
        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText, decodedResult) => {
            // 成功時にスキャンを停止して結果をコールバック
            if (html5QrCode?.isScanning) {
              html5QrCode.stop()
                .then(() => onScan(decodedText))
                .catch(err => {
                  console.error("スキャナの停止に失敗しました。", err);
                  onScan(decodedText);
                });
            }
          },
          (errorMessage) => {
            // エラーは無視
          }
        );

      } catch (err) {
        console.error("カメラのセットアップ中にエラーが発生しました:", err);
        alert(err instanceof Error ? err.message : "カメラの起動に失敗しました。サイトへのアクセス許可を確認してください。");
        onClose();
      }
    };

    setupScanner();

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      // html5QrCodeインスタンスが存在し、スキャン中であれば停止
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(err => {
          console.error("クリーンアップ中のスキャナ停止に失敗しました。", err);
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
        {/* readerのidを持つdivを直接配置 */}
        <div id="reader" className="w-full aspect-square rounded-lg overflow-hidden mb-4 border-2 border-gray-300 bg-gray-100" />
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