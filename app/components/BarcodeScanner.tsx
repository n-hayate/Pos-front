'use client';

import { useEffect, useRef } from 'react';
// 型定義のためにインポート
import type { Html5Qrcode, Html5QrcodeCameraScanConfig, QrCodeSuccessCallback, QrCodeErrorCallback } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // useEffect内での重複実行を防ぐためのフラグ
  const isScanningStarted = useRef(false);

  useEffect(() => {
    // ライブラリの動的インポート
    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      
      const qrCode = scannerRef.current ?? new Html5Qrcode(
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
      scannerRef.current = qrCode;

      if (qrCode.isScanning || isScanningStarted.current) {
        return;
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // iPhoneでのスキャン成功率を向上させるための設定
        aspectRatio: 1.0, 
      };

      const qrCodeSuccessCallback: QrCodeSuccessCallback = (decodedText, decodedResult) => {
        if (qrCode.isScanning) {
          isScanningStarted.current = false; // スキャン終了
          qrCode.stop().then(() => {
            onScan(decodedText);
          }).catch((err: unknown) => {
            console.error("スキャナーの停止に失敗しました。", err);
            onScan(decodedText);
          });
        }
      };

      const qrCodeErrorCallback: QrCodeErrorCallback = (errorMessage) => {
        // スキャンエラーは無視
      };

      // === 新しいカメラ起動ロジック ===
      const startScanning = async () => {
        if (!qrCode || qrCode.isScanning) return;

        // 一度スキャン開始処理が走ったら、重複して呼ばないようにする
        isScanningStarted.current = true; 

        try {
          // --- 第1試行: facingMode: "environment" で背面カメラを要求 ---
          console.log("第1試行: facingMode: 'environment' でカメラを起動します。");
          await qrCode.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          );
        } catch (err1) {
          console.warn("facingMode: 'environment' での起動に失敗しました。フォールバックします。", err1);

          try {
            // --- 第2試行: カメラリストを取得して背面カメラを探す ---
            console.log("第2試行: カメラリストから背面カメラを探します。");
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
              const rearCamera = cameras.find(camera => camera.label.toLowerCase().includes('back'));
              let cameraIdToUse: string;

              if (rearCamera) {
                console.log("ラベルに 'back' を含むカメラが見つかりました。");
                cameraIdToUse = rearCamera.id;
              } else if (cameras.length > 1) {
                console.log("ラベルに 'back' を含むカメラは見つかりませんでした。リストの最後のカメラを背面カメラと見なして使用します。");
                cameraIdToUse = cameras[cameras.length - 1].id;
              } else {
                 console.log("カメラが1台のみ検出されました。そのカメラを使用します。");
                cameraIdToUse = cameras[0].id;
              }
              
              await qrCode.start(
                cameraIdToUse,
                config,
                qrCodeSuccessCallback,
                qrCodeErrorCallback
              );
            } else {
              // --- 第3試行: カメラリストが取得できない場合、デフォルトで試す ---
               console.log("第3試行: カメラリストが空です。デフォルト設定でカメラを起動します。");
               await qrCode.start({}, config, qrCodeSuccessCallback, qrCodeErrorCallback);
            }
          } catch (err2) {
            console.error("全てのカメラ起動の試行に失敗しました。", err2);
            isScanningStarted.current = false;
            onClose(); // ユーザーにエラーを通知し、モーダルを閉じる
          }
        }
      };
      
      startScanning();

    }).catch((err: unknown) => {
      console.error("html5-qrcodeライブラリの読み込みに失敗しました。", err);
    });

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      const qrCode = scannerRef.current;
      if (qrCode && qrCode.isScanning) {
        qrCode.stop().catch((err: unknown) => {
          console.error("クリーンアップ中のスキャナー停止に失敗しました。", err);
        });
      }
      isScanningStarted.current = false;
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
