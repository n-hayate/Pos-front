// app/lib/api.ts
import type { Product, PurchaseRequest, PurchaseResponse } from "@/app/types";

// API URLの取得と検証
const getApiUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  
  if (!raw) {
    throw new Error("環境変数 NEXT_PUBLIC_API_URL が設定されていません");
  }
  
  // httpsが含まれていない場合は追加
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  
  // 末尾のスラッシュを削除
  return withProto.replace(/\/$/, "");
};

const API_URL = getApiUrl();

// 開発環境でのログ出力
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API] URL:', API_URL);
}

/**
 * 商品検索API
 */
export async function searchProduct(code: string): Promise<{ product: Product | null }> {
  const url = `${API_URL}/search_product`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Error]', errorText);
      throw new Error(`商品検索API Error ${res.status}: ${errorText}`);
    }

    return res.json();
  } catch (error: any) {
    console.error('[商品検索エラー]', error);
    throw new Error(error.message || '商品検索中にエラーが発生しました');
  }
}

/**
 * 購入API
 */
export async function purchaseItems(payload: PurchaseRequest): Promise<PurchaseResponse> {
  const url = `${API_URL}/purchase`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Error]', errorText);
      throw new Error(`購入API Error ${res.status}: ${errorText}`);
    }

    return res.json();
  } catch (error: any) {
    console.error('[購入エラー]', error);
    throw new Error(error.message || '購入処理中にエラーが発生しました');
  }
}
