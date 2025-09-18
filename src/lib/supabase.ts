import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 검색 결과 타입
export interface SearchResult {
  kind: "item" | "buyer" | "order";
  id: number;
  title: string;
  category: string;
  rank: number;
}

// 품목 타입
export interface Item {
  id: number;
  name_ko: string;
  category: string;
  created_at: string;
}

// 구매자 타입
export interface Buyer {
  id: number;
  full_name: string;
  note: string;
  created_at: string;
}

// 주문 타입
export interface Order {
  id: number;
  buyer_id: number;
  item_id: number;
  qty: number;
  price: number;
  purchased_at: string;
  created_at: string;
}
