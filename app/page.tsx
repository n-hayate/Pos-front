'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
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
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  }, []);

  useEffect(() => {
    const newTotal = purchaseList.reduce((sum, item) => sum + item.prd_price * item.quantity, 0);
    setTotalAmount(newTotal);
  }, [purchaseList]);

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  }, []);

  const handleScan = useCallback(async (result: string) => {
    setIsScannerOpen(false);
    addLog(`スキャン成功: ${result}`);
    try {
      addLog(`API検索中...`);
      const data = await searchProduct(result);
      if (data && data.product) {
        addLog(`商品発見: ${data.product.prd_name}`);
        setScannedProduct(data.product); // スキャンした商品をstateに保存
        showNotification(`「${data.product.prd_name}」をスキャンしました`, 'success');
      } else {
        showNotification('商品が見つかりませんでした', 'error');
        addLog(`商品コード [${result}] は見つかりませんでした`);
        setScannedProduct(null);
      }
    } catch (error: any) {
      showNotification('商品検索エラー', 'error');
      addLog(`[エラー] 商品検索に失敗: ${error.message}`);
      setScannedProduct(null);
    }
  }, [addLog, showNotification]);

  // ▼▼▼【修正点】商品を追加するロジックを分離▼▼▼
  const handleAddItem = () => {
    if (!scannedProduct) return;

    const existingItem = purchaseList.find(item => item.prd_id === scannedProduct.prd_id);
    if (existingItem) {
      showNotification('この商品は既に追加されています', 'error');
    } else {
      setPurchaseList(prevList => [...prevList, { ...scannedProduct, quantity: 1 }]);
      showNotification(`「${scannedProduct.prd_name}」を追加しました`, 'success');
    }
    setScannedProduct(null); // 追加後はスキャン商品をクリア
  };

  const handlePurchase = async () => {
    if (purchaseList.length === 0) {
      showNotification('購入リストは空です', 'error');
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
      if (data.success) {
        showNotification(`購入完了！ 合計: ${data.total_amount}円`, 'success');
        setPurchaseList([]);
      } else {
        showNotification('購入処理に失敗しました', 'error');
      }
    } catch (error: any) {
      showNotification('購入中にエラーが発生しました', 'error');
      addLog(`[エラー] 購入処理に失敗: ${error.message}`);
    }
  };
  
  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center text-gray-800">バーコードをスキャン</h3>
            <BarcodeScanner
              onScan={handleScan}
              onError={(error) => addLog(`[SCANNER ERROR] ${error}`)}
            />
            <button
              onClick={() => setIsScannerOpen(false)}
              className="w-full mt-4 px-4 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">モバイルPOS</h1>
        </header>

        <main className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-blue-700 transition-colors text-lg shadow-md active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>📷</span>
            <span>バーコードをスキャン</span>
          </button>

          {/* ▼▼▼【修正点】スキャンした商品を表示し、「追加」ボタンを設置▼▼▼ */}
          {scannedProduct && (
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="text-lg font-bold text-gray-800 mb-2">スキャンした商品</h3>
              <div className="space-y-1 text-gray-700">
                <p><span className="font-semibold">商品名:</span> {scannedProduct.prd_name}</p>
                <p><span className="font-semibold">価格:</span> {scannedProduct.prd_price.toLocaleString()}円</p>
              </div>
              <button
                onClick={handleAddItem}
                className="w-full mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors active:scale-95"
              >
                購入リストに追加
              </button>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">購入リスト</h2>
            <div className="space-y-3">
              {purchaseList.length > 0 ? (
                purchaseList.map((item) => (
                  <div key={item.prd_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1 font-medium text-gray-700">{item.prd_name}</span>
                    <span className="w-28 text-right text-gray-600">{item.prd_price.toLocaleString()}円 x {item.quantity}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">商品は追加されていません</p>
              )}
            </div>
          </div>

          <div className="border-t-2 border-gray-200 pt-4">
            <div className="flex justify-between items-center text-2xl font-bold text-gray-800 mb-4">
              <span>合計金額</span>
              <span>{totalAmount.toLocaleString()}円</span>
            </div>
            <button
              onClick={handlePurchase}
              className="w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-xl shadow-md disabled:bg-gray-400 active:scale-95"
              disabled={purchaseList.length === 0}
            >
              会計
            </button>
          </div>
        </main>
        
        <footer className="mt-6">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="w-full text-sm text-gray-600 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-lg"
          >
            {showDebug ? '▲ デバッグログを隠す' : '▼ デバッグログを表示'}
          </button>
          {showDebug && (
            <div className="mt-2 p-4 bg-gray-800 text-white rounded-lg text-xs font-mono whitespace-pre-wrap h-40 overflow-y-auto">
              {logs.length > 0 ? logs.map((log, i) => <Fragment key={i}>{log}<br/></Fragment>) : "ログはありません"}
            </div>
          )}
          {showDebug && <button onClick={() => setLogs([])} className="w-full text-xs text-gray-500 mt-1">クリア</button>}
        </footer>
      </div>
    </div>
  );
}