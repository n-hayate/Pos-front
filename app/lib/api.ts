// app/lib/api.ts
import type { Product, PurchaseRequest, PurchaseResponse } from "@/app/types";

// 環境変数の正規化
const raw = process.env.NEXT_PUBLIC_API_URL || "";
function normalize(url: string) {
  const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProto.replace(/\/$/, "");
}
const API_URL = normalize(raw);

function assertApiUrl() {
  if (!API_URL || API_URL === "https://")
    throw new Error("NEXT_PUBLIC_API_URL が不正です（https:// を含むフルURLを設定して再ビルド）");
}

// ====================
// 商品検索API
// ====================
export async function searchProduct(code: string): Promise<{ product: Product | null }> {
  assertApiUrl();
  const url = `${API_URL}/search_product`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Search API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ====================
// 購入API
// ====================
export async function purchaseItems(payload: PurchaseRequest): Promise<PurchaseResponse> {
  assertApiUrl();
  const url = `${API_URL}/purchase`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Purchase API ${res.status}: ${await res.text()}`);
  return res.json();
}
