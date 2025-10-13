"use client";

import { useEffect, useRef, useState } from "react";
import { scanImageData, ZBarSymbol } from "@undecaf/zbar-wasm";

interface BarcodeScannerProps {
  onScan?: (janCode: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const SCAN_INTERVAL = 1000; // 連続スキャンを防ぐ間隔 (ミリ秒)

  // JANコードが正しい形式（8桁 or 13桁）かチェックする関数
  const isValidJAN = (code: string): boolean => /^(\d{8}|\d{13})$/.test(code);

  // カメラからの映像をフレームごとに解析するメインループ
  const scanLoop = async () => {
    if (!isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }

    if (!videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0) {
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const results: ZBarSymbol[] = await scanImageData(imageData);

      if (results.length > 0) {
        const rawData = results[0].data;
        let scannedCode: string;

        if (typeof rawData === 'string') {
          scannedCode = rawData;
        } else {
          scannedCode = new TextDecoder('utf-8').decode(rawData);
        }
        scannedCode = scannedCode.trim();

        if (scannedCode && isValidJAN(scannedCode)) {
          const now = Date.now();
          if (now - lastScannedTimeRef.current >= SCAN_INTERVAL) {
            lastScannedTimeRef.current = now;
            onScan?.(scannedCode);
          }
        }
      }
    } catch (e) {
      console.error("スキャン処理中にエラーが発生しました:", e);
      onError?.("スキャン処理中にエラーが発生しました。");
    } finally {
      isProcessingRef.current = false;
    }
  };

  // カメラを起動する関数
  const startScanning = async () => {
    try {
      // ▼▼▼ ここが最終修正点です ▼▼▼
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: "environment" }, // "ideal" から "exact" へ変更
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      console.error("カメラの起動に失敗しました:", err);
      onError?.("背面カメラの起動に失敗しました。カメラの権限が許可されているか確認してください。");
    }
  };

  // カメラを停止する関数
  const stopScanning = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // コンポーネントが表示されたらカメラを起動し、消えたら停止する
  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full relative">
      <video
        ref={videoRef}
        className="w-full h-60 bg-gray-900 rounded-lg object-cover"
        autoPlay
        muted
        playsInline
      />
      {/* スキャン範囲を示すためのガイドUI */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-11/12 h-2/5 border-4 border-red-500 border-dashed rounded-lg opacity-75"></div>
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500"></div>
      </div>
    </div>
  );
}
