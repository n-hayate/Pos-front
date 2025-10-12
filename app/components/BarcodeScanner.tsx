'use client';

import { useEffect, useRef } from 'react';
// QrCodeErrorCallback のタイポを QrcodeErrorCallback に修正
import type { Html5Qrcode, Html5QrcodeCameraScanConfig, QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // 複数回の実行を防ぐためのフラグ
  const scannerInitializing = useRef(false);

  useEffect(() => {
    // すでに初期化処理が進行中、またはスキャン中の場合は何もしない
    if (scannerInitializing.current) {
      return;
    }
    scannerInitializing.current = true;

    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      const qrCode = new Html5Qrcode('reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      scannerRef.current = qrCode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const qrCodeSuccessCallback: QrcodeSuccessCallback = (decodedText) => {
        if (qrCode.isScanning) {
          qrCode.stop().then(() => onScan(decodedText));
        }
      };

      // 正しい型 'QrcodeErrorCallback' を使用
      const qrCodeErrorCallback: QrcodeErrorCallback = () => { /* スキャン中のエラーは無視 */ };

      /**
       * Permission First アプローチで、インカメラのチラつきなしに背面カメラを直接起動する
       */
      const startRearCameraDirectly = async () => {
        if (!qrCode || qrCode.isScanning) return;

        try {
          // ステップ1 & 2: サイレントな事前承認 & 正確なカメラ情報の取得
          // facingModeを指定してgetUserMediaを呼び出すことで、許可プロンプトをトリガーし、
          // デバイスリストに正確なfacingMode情報（environment/user）を反映させる。
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          // このストリームは許可を得るためだけなので、即座に停止する。これによりインカメラの映像が一瞬でも表示されるのを防ぐ。
          stream.getTracks().forEach(track => track.stop());

          // ステップ3: 背面カメラのIDを特定
          const cameras = await Html5Qrcode.getCameras();
          let rearCameraId: string | null = null;
          
          if (cameras && cameras.length > 0) {
              // 理想的には、facingModeプロパティで背面カメラを見つける
              const rearCamera = cameras.find((camera) => (camera as any).facing === 'environment');
              if (rearCamera) {
                  rearCameraId = rearCamera.id;
              } else {
                  // facingModeが利用できない場合のフォールバックとして、ラベルに'back'等が含まれるものを探す
                  const rearCameraByLabel = cameras.find(camera => camera.label.toLowerCase().includes('back') || camera.label.toLowerCase().includes('arrière') || camera.label.toLowerCase().includes('后面'));
                  if (rearCameraByLabel) {
                      rearCameraId = rearCameraByLabel.id;
                  } else if (cameras.length > 1) {
                      // 最終手段として、リストの最後のカメラを背面カメラと仮定する
                      rearCameraId = cameras[cameras.length - 1].id;
                  } else {
                      rearCameraId = cameras[0].id;
                  }
              }
          }

          if (!rearCameraId) {
            throw new Error("背面カメラが見つかりませんでした。");
          }

          // ステップ4: 特定したIDでスキャナーを直接起動
          await qrCode.start(
            rearCameraId,
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );

        } catch (err) {
          console.error("カメラの起動に失敗しました。ユーザーが許可しなかったか、対応するカメラがありません。", err);
          // ユーザーが許可しなかった場合なども考慮し、モーダルを閉じる
          onClose();
        }
      };
      
      startRearCameraDirectly();

    }).catch(err => {
        console.error("ライブラリの読み込みに失敗しました。", err);
        scannerInitializing.current = false;
    });

    return () => {
      const qrCode = scannerRef.current;
      if (qrCode && qrCode.isScanning) {
        qrCode.stop().catch(err => console.error("クリーンアップ時のスキャナー停止に失敗しました。", err));
      }
      scannerInitializing.current = false;
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

