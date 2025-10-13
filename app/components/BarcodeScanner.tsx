'use client';

import { useEffect, useRef } from 'react';
import type { Html5Qrcode, Html5QrcodeCameraScanConfig, QrcodeSuccessCallback, QrcodeErrorCallback } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const didFire = useRef(false); // 初期化処理の重複実行を確実に防ぐフラグ

  useEffect(() => {
    // すでに処理が実行されている場合は何もしない
    if (didFire.current) {
      return;
    }
    didFire.current = true;

    // 非同期でライブラリをインポート
    import('html5-qrcode').then(({ Html5Qrcode }) => {

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // 一部のブラウザで互換性の問題を起こすことがあるため、aspectRatioは削除を推奨
        // aspectRatio: 1.0,
      };

      const successCallback: QrcodeSuccessCallback = (decodedText) => {
        // スキャナがまだ動作中か確認してから停止処理を行う
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop()
            .then(() => onScan(decodedText))
            .catch(err => {
              console.error("スキャナの停止に失敗しましたが、結果を処理します。", err);
              onScan(decodedText);
            });
        }
      };

      const errorCallback: QrcodeErrorCallback = (errorMessage) => {
        // スキャンエラーは継続的に発生するため、通常は無視して問題ない
      };

      /**
       * 最も確実な背面カメラ起動ロジック
       * 1. 最初にカメラリストを取得し、権限を要求する
       * 2. リストから「背面」カメラのIDを特定する
       * 3. 特定したIDを使ってスキャナを起動する
       */
      const startScannerWithRearCamera = async () => {
        try {
          // ステップ1: カメラ権限を要求し、利用可能なカメラのリストを取得
          // この静的メソッドがユーザーに許可を求めるプロンプトをトリガーする
          const cameras = await Html5Qrcode.getCameras();

          if (!cameras || cameras.length === 0) {
            alert("利用可能なカメラが見つかりません。");
            onClose();
            return;
          }

          let rearCameraId: string | undefined;

          // ステップ2: 背面カメラを特定する
          if (cameras.length === 1) {
            // カメラが1台しかない場合はそれを使用
            rearCameraId = cameras[0].id;
          } else {
            // 複数ある場合、ラベルに "back" や "背面" が含まれるものを探す
            const rearCamera = cameras.find(camera => 
              camera.label.toLowerCase().includes('back') || 
              camera.label.toLowerCase().includes('背面')
            );
            
            // ラベルで見つかった、または見つからない場合のフォールバックとしてリストの最後のカメラを選択
            rearCameraId = rearCamera ? rearCamera.id : cameras[cameras.length - 1].id;
          }

          // ステップ3: 特定したIDでスキャナを初期化して起動
          const qrCodeScanner = new Html5Qrcode('reader', { verbose: false });
          scannerRef.current = qrCodeScanner;

          await qrCodeScanner.start(
            rearCameraId,
            config,
            successCallback,
            errorCallback
          );

        } catch (err) {
          console.error("カメラの起動処理中にエラーが発生しました:", err);
          alert("カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。");
          onClose();
        }
      };

      // 上記の関数を実行
      startScannerWithRearCamera();

    }).catch(err => {
      console.error("スキャナーライブラリの読み込みに失敗しました。", err);
      alert("スキャナーライブラリの読み込みに失敗しました。");
      onClose();
    });

    // コンポーネントがアンマウントされる際のクリーンアップ処理
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("クリーンアップ中のスキャナ停止に失敗しました。", err);
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、初回マウント時に一度だけ実行されるように保証

  // JSX
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
          バーコードをスキャン
        </h3>
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 border-2 border-gray-300 bg-gray-100">
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