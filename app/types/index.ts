// 商品データの型
export interface Product {
  prd_id: number;
  prd_code: string;
  prd_name: string;
  prd_price: number;
}

// 購入リスト内の商品の型
export interface PurchaseItem extends Product {
  quantity: 1; 
}

// 商品検索APIのレスポンスの型
export interface ProductSearchResponse {
  product: Product | null;
}

// 購入APIに送信するリクエスト全体の型
export interface PurchaseRequest {
  emp_cd?: string;
  store_cd: string;
  pos_no: string;
  items: PurchaseItem[];
}

// 購入APIのレスポンスの型
export interface PurchaseResponse {
  success: boolean;
  total_amount: number;
  total_amount_ex_tax: number;
}

