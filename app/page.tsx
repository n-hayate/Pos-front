'use client';

import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import BarcodeScanner from './components/BarcodeScanner';
import Notification from './components/Notification';
import { searchProduct, purchaseItems } from './lib/api';
import type { Product, PurchaseItem, PurchaseRequest } from './types';

export default function PosPage() {
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [purchaseList, setPurchaseList] = useState<PurchaseItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isTestModeOpen, setIsTestModeOpen] = useState(false); // 診断モード用のState

  // --- デバッグ機能 ---
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);
  // -------------------------

  useEffect(() => {
    const newTotal = purchaseList.reduce((sum, item) => sum + item.prd_price * item.quantity, 0);
    setTotalAmount(newTotal);
  }, [purchaseList]);

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleScan = useCallback(async (result: string) => {
    setIsScannerOpen(false);
    addLog(`スキャン結果: ${result}`);
    addLog(`APIサーバーに商品を問い合わせています...`);
    addLog(`宛先URL: ${process.env.NEXT_PUBLIC_API_URL}/search_product`);
    
    try {
      const data = await searchProduct(result);
      addLog(`API Response Body: ${JSON.stringify(data, null, 2)}`);
      
      if (data && data.product) {
        showNotification(`「${data.product.prd_name}」を読み取りました`, 'success');
        setScannedProduct(data.product);
      } else {
        showNotification('商品が見つかりませんでした', 'error');
        setScannedProduct(null);
      }
    } catch (error: any) {
        showNotification('商品検索でエラーが発生しました', 'error');
        addLog(`[CRITICAL ERROR] API通信に失敗しました。`);
        addLog(`[ERROR DETAIL] ${JSON.stringify({
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause,
            ...error
        }, null, 2)}`);
        setScannedProduct(null);
    }
  }, [addLog, showNotification]);

  const handleAddItem = () => {
    if (scannedProduct) {
      const existingItem = purchaseList.find(item => item.prd_id === scannedProduct.prd_id);
      if (existingItem) {
        showNotification('この商品は既に追加されています', 'error');
      } else {
        setPurchaseList([...purchaseList, { ...scannedProduct, quantity: 1 }]);
        addLog(`「${scannedProduct.prd_name}」を購入リストに追加しました。`);
      }
      setScannedProduct(null);
    }
  };

  const handlePurchase = async () => {
    if (purchaseList.length === 0) {
      showNotification('購入リストに商品がありません', 'error');
      return;
    }
    addLog(`${purchaseList.length}点の商品を購入します...`);
    try {
      const purchaseData: PurchaseRequest = {
        store_cd: '30',
        pos_no: '90',
        items: purchaseList,
      };
      const data = await purchaseItems(purchaseData);
      addLog(`購入API Response Body: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        showNotification(`購入が完了しました！ 合計: ${data.total_amount}円`, 'success');
        setPurchaseList([]);
        setScannedProduct(null);
      } else {
        showNotification('購入処理に失敗しました', 'error');
      }
    } catch (error: any) {
      showNotification('購入中にエラーが発生しました', 'error');
       addLog(`[CRITICAL ERROR] 購入API通信に失敗しました。`);
       addLog(`[ERROR DETAIL] ${JSON.stringify(error, null, 2)}`);
    }
  };

  // ▼▼▼ 診断用のロジック ▼▼▼
  const videoRef = useRef<HTMLVideoElement>(null);
  const [testLogs, setTestLogs] = useState<string[]>(['ログ:']);

  const addTestLog = (message: string) => {
      setTestLogs(prev => [...prev, `- ${message}`]);
  };

  const startTestCamera = async () => {
      addTestLog('ボタンがクリックされました。');
      const constraints = { video: { facingMode: "environment" } };
      addTestLog(`Constraints: ${JSON.stringify(constraints)}`);

      try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          addTestLog('✅ ストリームの取得に成功！');
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (err: any) {
          addTestLog(`❌ エラー: ${err.name} - ${err.message}`);
          alert(`カメラ起動に失敗: ${err.name}`);
      }
  };
  
  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* ▼▼▼ 診断モードのUI ▼▼▼ */}
      {isTestModeOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4 text-center text-gray-800">カメラAPI 直接診断</h3>
            <video ref={videoRef} playsInline autoPlay muted className="w-full aspect-square bg-gray-900 border-2 border-gray-300 rounded-lg" />
            <button onClick={startTestCamera} className="w-full mt-4 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg">カメラ起動</button>
            <button onClick={() => setIsTestModeOpen(false)} className="w-full mt-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg">閉じる</button>
            <pre className="mt-4 p-2 bg-gray-100 text-xs h-24 overflow-y-auto whitespace-pre-wrap">{testLogs.join('\n')}</pre>
          </div>
        </div>
      )}

      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-800">モバイルPOSアプリ</h1>
      </header>

      <main className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <div className="mb-6">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-lg shadow-md active:scale-95"
          >
            スキャン（カメラ）
          </button>
        </div>

        {scannedProduct && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-bold text-gray-700 mb-2">スキャンした商品</h2>
            <div className="space-y-1">
              <p><span className="font-semibold">コード:</span> {scannedProduct.prd_code}</p>
              <p><span className="font-semibold">商品名:</span> {scannedProduct.prd_name}</p>
              <p><span className="font-semibold">価格:</span> {scannedProduct.prd_price}円</p>
            </div>
            <button
              onClick={handleAddItem}
              className="w-full mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors active:scale-95"
            >
              追加
            </button>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">購入リスト</h2>
          <div className="space-y-2">
            {purchaseList.length > 0 ? (
              purchaseList.map((item) => (
                <div key={item.prd_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="flex-1">{item.prd_name}</span>
                  <span className="w-24 text-right">{item.prd_price}円 x {item.quantity}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">商品がありません</p>
            )}
          </div>
        </div>

        <div className="border-t-2 border-gray-200 pt-4">
          <div className="flex justify-between items-center text-2xl font-bold text-gray-800 mb-4">
            <span>合計金額</span>
            <span>{totalAmount}円</span>
          </div>
          <button
            onClick={handlePurchase}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-xl shadow-md disabled:bg-gray-400 active:scale-95"
            disabled={purchaseList.length === 0}
          >
            購入
          </button>
        </div>
      </main>
      
      <footer className="max-w-2xl mx-auto mt-4">
        <button
          onClick={() => setIsTestModeOpen(true)}
          className="w-full text-sm text-white bg-orange-600 hover:bg-orange-700 py-2 px-4 rounded-lg mb-2"
        >
          カメラAPI 直接診断モード
        </button>
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="w-full text-sm text-gray-600 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-lg"
        >
          {showDebug ? '▲ デバッグコンソールを隠す' : '▼ デバッグコンソールを表示'}
        </button>
        {showDebug && (
          <div className="mt-2 p-4 bg-gray-800 text-white rounded-lg text-xs font-mono whitespace-pre-wrap h-48 overflow-y-auto">
            {logs.length > 0 ? logs.map((log, i) => <Fragment key={i}>{log}<br/></Fragment>) : "ログはありません"}
          </div>
        )}
        {showDebug && <button onClick={() => setLogs([])} className="w-full text-xs text-gray-500 mt-1">クリア</button>}
      </footer>
    </div>
  );
}