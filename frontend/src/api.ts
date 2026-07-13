import axios from "axios";

// عميل API — يوجّه الطلبات لـ Django backend
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

// إرفاق توكن الدخول تلقائياً
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Wallet {
  balance: string;
  credit_limit: string;
  currency: string;
  available: string;
}
export interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  theme: string;
  theme_color: string;
}
export interface User {
  id: number;
  login_id: string;
  name: string;
  role: string;
  role_label: string;
  tenant: Tenant | null;
  wallet: Wallet | null;
}
export interface Game {
  id: number;
  name: string;
  image_url: string;
  status: string;
  status_label: string;
  require_player_id: boolean;
  product_count: number;
  dealer_note: string;
  description: string;
  kurulu_sale: boolean;
  toplu_sale: boolean;
  sms_template: string;
  sort_order: number;
  created_at: string;
}
export interface Product {
  id: number;
  game: number;
  game_name: string;
  name: string;
  cost_price: string;
  recommended_price: string;
  profit: string;
  kupur: string;
  status: string;
  status_label: string;
  execution_type: string;
  is_parcali: boolean;
  provider: number | null;
  provider_alt1: number | null;
  provider_alt2: number | null;
  provider_package_id: string;
  description: string;
  sort_order: number;
  created_at: string;
}
export interface GameDetail extends Game {
  products: Product[];
}
export interface Order {
  id: number;
  receipt_no: string;
  dealer_name: string;
  game_name: string;
  product_name: string;
  player_id: string;
  customer_phone: string;
  cost_price: string;
  sell_price: string;
  profit: string;
  status: string;
  status_label: string;
  provider_name: string;
  pin_result: string;
  api_response: string;
  balance_before: string;
  balance_after: string;
  created_at: string;
}
export interface Provider {
  id: number;
  name: string;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  real_balance: string;
  balance: string;
  debt: string;
  loss_guard: boolean;
  auto_update: boolean;
}
export interface Dealer {
  id: number;
  login_id: string;
  name: string;
  balance: string;
  credit_limit: string;
  currency: string;
  status: string;
  country: string;
  group: string;
  shopping: boolean;
  oyun: boolean;
  active: boolean;
  children_count: number;
}
