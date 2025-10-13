'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const isComponentMounted = useRef(false);

  useEffect(() => {
    if (isComponentMounted.current) {
      return;
    }
    isComponentMounted.current = true;

    let html5QrCode: Html5Qrcode | undefined;

    const getRearCameraId = async (): Promise<string> => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error("利用可能なカメラが見つかりません。");
      }

      const rearCamera = videoDevices.find(device => /back|背面/.test(device.label.toLowerCase()));
      
      // 【修正点 1/2】 .id -> .deviceId に変更
      return rearCamera ? rearCamera.deviceId : videoDevices[videoDevices.length - 1].deviceId;
    };


    const setupAndStartScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        const rearCameraId = await getRearCameraId();
        
        const scannerElement = document.getElementById('reader');
        if (!scannerElement) {
          throw new Error("スキャナ用のDOM要素 '#reader' が見つかりません。");
        }

        html5QrCode = new Html5Qrcode(scannerElement.id);

        await html5QrCode.start(
          rearCameraId, // 特定したIDを直接指定
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (html5QrCode?.isScanning) {
              // 【修正点 2/2】 念のため、成功時の停止処理も追加
              html5QrCode.stop().then(() => onScan(decodedText)).catch(err => {
                  console.error("スキャナの停止に失敗しましたが、結果を処理します。", err);
                  onScan(decodedText);
              });
            }
          },
          (errorMessage) => { /* エラーは無視 */ }
        );

      } catch (err) {
        console.error("カメラのセットアップ中に致命的なエラーが発生:", err);
        const message = err instanceof Error ? err.message : "カメラの起動に失敗しました。";
        alert(`${message}\n\nサイトにカメラのアクセス許可が与えられているか確認してください。`);
        onClose();
      }
    };

    setupAndStartScanner();

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(err => {
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