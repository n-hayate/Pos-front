import type { ProductSearchResponse, PurchaseRequest, PurchaseResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * 商品コードで商品を検索する関数
 * @param code スキャンしたバーコード
 * @returns 商品情報またはnullを含むPromise
 */
export const searchProduct = async (code: string): Promise<ProductSearchResponse> => {
  const response = await fetch(`${API_URL}/search_product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    // エラー時はレスポンス自体を例外として投げ、詳細なエラーハンドリングを呼び出し元に委ねる
    throw response;
  }
  return response.json();
};

/**
 * 購入処理を行う関数
 * @param purchaseData 購入する商品のリストなどを含むデータ
 * @returns 購入結果のPromise
 */
export const purchaseItems = async (purchaseData: PurchaseRequest): Promise<PurchaseResponse> => {
  const response = await fetch(`${API_URL}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchaseData),
  });
  if (!response.ok) {
    throw response;
  }
  return response.json();
};

