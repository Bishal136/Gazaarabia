import { apiFetch } from "../api";

export interface DashboardData {
  blogs: number;
  blogCategories: number;
  brands: number;
  sizes: number;
  colors: number;
  categories: number;
  subcategories: number;
  deliveryOptions: number;
  materialCares: number;
  products: number;
  users: number;
  orders: number;
  sellers: number;
  activeSellers: number;
  pendingSellers: number;
  pendingOrders: number;
  openDisputes: number;
  pendingPayouts: number;
  lowStockProducts: number;
  syncFailures?: number;
  totalRevenue: number;
  recentBlogs: { id: number; title: string; createdAt: string }[];
  charts: {
    ordersOverTime: Record<string, number>;
    revenueOverTime: Record<string, number>;
    orderStatus: { status: string; _count: { id: number } }[];
  };
  systemHealth: {
    payments: string;
    database: string;
    updatedAt: string;
  };
}

export const dashboardService = {
  getDashboard: (token: string): Promise<DashboardData> =>
    apiFetch("/api/dashboard", {}, token),
};
