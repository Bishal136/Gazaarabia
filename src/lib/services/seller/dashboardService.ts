import { apiFetch } from "../../api";

export interface AttentionTask {
  id: string;
  task: string;
  action: string;
  href: string;
}

export interface SellerDashboardData {
  netSales: number;
  paidOrdersCount: number;
  orders: number;
  ordersPendingPayment: number;
  ordersSubtitle: string;

  products: {
    total: number;
    live: number;
    drafts: number;
  };

  reviews: {
    count: number;
    avgRating: number;
  };

  attentionTasks: AttentionTask[];

  balances: {
    available: number;
    pending: number;
    paidOut: number;
    totalEarned: number;
  };

  storeConnection: {
    connected: boolean;
    storeType: string | null;
    shopName: string;
    lastSyncedAt: string | null;
    itemsNeedingReview: number;
  };

  // Backward compatibility
  productsCount?: number;
  revenue?: number;
  avgRating?: number;
  lowStock?: number;
  reviewsCount?: number;
  recentOrders?: any[];
  charts?: any;
}

export const dashboardService = {
  getDashboard: (token: string): Promise<SellerDashboardData> =>
    apiFetch("/api/seller/dashboard", {}, token),
};
