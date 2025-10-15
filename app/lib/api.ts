// app/lib/api.ts
import type { Product, PurchaseRequest, PurchaseResponse } from "@/app/types";

// 環境変数の取得と正規化
const getApiUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL || "";
  
  if (!raw) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }
  
  // httpsプロトコルがない場合は追加
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  
  // 末尾のスラッシュを除去
  return withProto.replace(/\/$/, "");
};

const API_URL = getApiUrl();

// デバッグ用（開発環境でのみログ出力）
if (process.env.NODE_ENV === 'development') {
  console.log('API_URL:', API_URL);
}

// 商品検索API
export async function searchProduct(code: string): Promise<{ product: Product | null }> {
  const url = `${API_URL}/search_product`;
  
  console.log('Searching product at:', url);
  
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
    console.error('Search API Error:', errorText);
    throw new Error(`Search API ${res.status}: ${errorText}`);
  }
  
  return res.json();
}

// 購入API
export async function purchaseItems(payload: PurchaseRequest): Promise<PurchaseResponse> {
  const url = `${API_URL}/purchase`;
  
  console.log('Purchasing items at:', url);
  
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
    console.error('Purchase API Error:', errorText);
    throw new Error(`Purchase API ${res.status}: ${errorText}`);
  }
  
  return res.json();
}
