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
export interface Dealer {
  id: number;
  login_id: string;
  name: string;
  balance: string;
  credit_limit: string;
  currency: string;
  status: string;
  group: string;
  oyun: boolean;
  children_count: number;
}
