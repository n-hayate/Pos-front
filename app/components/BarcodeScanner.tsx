'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  // Html5Qrcodeのインスタンスを保持するためのref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // スキャナのインスタンスを作成する関数
    const createScanner = () => {
      // 既にインスタンスがあれば何もしない
      if (html5QrCodeRef.current) {
        return;
      }
      // UIを持たない低レベルなスキャナインスタンスを生成
      const qrCode = new Html5Qrcode(
        'reader', 
        // ▼▼▼【エラー修正箇所】▼▼▼
        // ライブラリの仕様でverboseプロパティが必須のため追加します
        {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          verbose: false
        }
      );
      html5QrCodeRef.current = qrCode;
    };

    // カメラを起動してスキャンを開始する非同期関数
    const startScan = async () => {
      createScanner();
      const qrCode = html5QrCodeRef.current;
      if (!qrCode) return;

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          // 背面カメラ('back' or 'rear')を優先的に選択、なければ最初のカメラを使用
          const cameraId = cameras.find(camera => camera.label.toLowerCase().includes('back') || camera.label.toLowerCase().includes('rear'))?.id || cameras[0].id;
          
          // カメラを直接起動
          await qrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText, decodedResult) => {
              // スキャン成功時の処理
              if (qrCode.isScanning) {
                  // 成功したら即座にスキャンを停止
                  qrCode.stop();
              }
              onScan(decodedText);
            },
            (errorMessage) => {
              // スキャン中の解析エラーは無視
            }
          );
        } else {
          console.error("カメラが見つかりませんでした。");
          onClose(); // カメラがない場合は閉じる
        }
      } catch (error) {
        console.error("カメラの起動に失敗しました。", error);
        onClose(); // 起動に失敗した場合も閉じる
      }
    };

    startScan();

    // コンポーネントが閉じられる際のクリーンアップ処理
    return () => {
      const qrCode = html5QrCodeRef.current;
      if (qrCode && qrCode.isScanning) {
        qrCode.stop().catch(err => console.error("クリーンアップ中のスキャナ停止に失敗しました。", err));
      }
    };
  }, [onScan, onClose]);

  // コンポーネントのUI部分
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        {/* カメラ映像がここに直接表示される */}
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

