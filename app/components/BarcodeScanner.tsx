"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const SCAN_INTERVAL = 1000;
  const initialized = useRef(false);

  const isValidJAN = (code: string): boolean => /^(\d{8}|\d{13})$/.test(code);

  const scanLoop = async () => {
    // requestAnimationFrameの呼び出しをループの最初に移動
    if (videoRef.current && stream) {
        animationFrameRef.current = requestAnimationFrame(scanLoop);
    }

    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0) return;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      isProcessingRef.current = false;
      return;
    }
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
      console.error("スキャン処理エラー:", e);
      onError?.("スキャン処理中にエラーが発生しました。");
    } finally {
      isProcessingRef.current = false;
    }
  };

  const startScanning = useCallback(async () => {
    let mediaStream: MediaStream | null = null;
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
    try {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { ...videoConstraints, facingMode: { exact: "environment" } },
          audio: false,
        });
      } catch (err) {
        console.warn("exact: environment 失敗。フォールバックします...", err);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { ...videoConstraints, facingMode: "environment" },
          audio: false,
        });
      }
      if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        animationFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.error("カメラ起動失敗:", err);
      onError?.("カメラの起動に失敗しました。権限を確認してください。");
    }
  }, [onScan, onError]);

  const stopScanning = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  return (
    <div className="w-full relative">
      <video
        ref={videoRef}
        className="w-full h-60 bg-gray-900 rounded-lg object-cover"
        autoPlay
        muted
        playsInline
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-11/12 h-2/5 border-4 border-red-500 border-dashed rounded-lg opacity-75"></div>
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 animate-scan"></div>
      </div>
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s infinite alternate ease-in-out;
        }
      `}</style>
    </div>
  );
}