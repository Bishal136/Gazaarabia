"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SellerLoader from "@/components/seller/SellerLoader";
import { ROUTES } from "@/constants/routes";
import {
  dashboardService,
  SellerDashboardData,
} from "@/lib/services/seller/dashboardService";

function formatGBP(amount: number): string {
  const num = Number(amount || 0);
  return num.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never synced";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication & authorization redirect
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.SELLER.LOGIN);
    } else if (status === "authenticated" && session?.user?.role !== "seller") {
      router.replace(ROUTES.HOME);
    }
  }, [status, session?.user?.role, router]);

  // Fetch real seller dashboard data from backend
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.token) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const result = await dashboardService.getDashboard(session.user.token);
        setData(result);
      } catch (err) {
        console.error("Seller dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [status, session?.user?.token]);

  if (loading) {
    return <SellerLoader />;
  }

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto my-12 bg-white rounded-2xl border border-gray-200 text-center shadow-xs">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-gray-500 mb-6">
          There was an issue fetching your store metrics. Please refresh or try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-secondary)] transition"
        >
          Reload Dashboard
        </button>
      </div>
    );
  }

  const liveCount = data.products?.live ?? 0;
  const draftCount = data.products?.drafts ?? 0;
  const totalProducts = data.products?.total ?? (liveCount + draftCount);

  const reviewsCount = data.reviews?.count ?? 0;
  const avgRating = data.reviews?.avgRating ?? 0;

  const netSales = data.netSales ?? 0;
  const paidOrdersCount = data.paidOrdersCount ?? 0;

  const ordersCount = data.orders ?? 0;
  const ordersSubtitle = data.ordersSubtitle || (data.ordersPendingPayment > 0 ? "Payment pending" : "All fulfilled");

  const availableBalance = data.balances?.available ?? 0;
  const pendingBalance = data.balances?.pending ?? 0;
  const paidOutBalance = data.balances?.paidOut ?? 0;

  const storeConnection = data.storeConnection;
  const isStoreConnected = storeConnection?.connected ?? false;
  const storeTypeDisplay = storeConnection?.storeType
    ? storeConnection.storeType === "woocommerce"
      ? "WooCommerce connected"
      : storeConnection.storeType === "shopify"
      ? "Shopify connected"
      : `${storeConnection.storeType} connected`
    : "No store connected";

  const attentionTasks = data.attentionTasks ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full space-y-6">
      {/* ── TOP STATS ROW (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Net Sales Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-tight">Net sales</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight mt-1.5 mb-1">
              GBP {formatGBP(netSales)}
            </p>
          </div>
          <p className="text-xs text-gray-400 font-normal">
            {netSales > 0
              ? `From ${paidOrdersCount} paid ${paidOrdersCount === 1 ? "order" : "orders"}`
              : "No paid sales yet"}
          </p>
        </div>

        {/* 2. Orders Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-tight">Orders</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight mt-1.5 mb-1">
              {ordersCount}
            </p>
          </div>
          <p className="text-xs text-gray-400 font-normal">{ordersSubtitle}</p>
        </div>

        {/* 3. Products Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-tight">Products</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight mt-1.5 mb-1">
              {totalProducts}
            </p>
          </div>
          <p className="text-xs text-gray-400 font-normal">
            {liveCount} live / {draftCount} {draftCount === 1 ? "draft" : "drafts"}
          </p>
        </div>

        {/* 4. Reviews Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-tight">Reviews</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight mt-1.5 mb-1">
              {reviewsCount > 0 ? `${avgRating} ★ (${reviewsCount})` : "No reviews"}
            </p>
          </div>
          <p className="text-xs text-gray-400 font-normal">
            {reviewsCount > 0
              ? `Based on ${reviewsCount} customer ${reviewsCount === 1 ? "review" : "reviews"}`
              : "Your first review appears here"}
          </p>
        </div>
      </div>

      {/* ── MIDDLE ROW: Needs your attention & Available balance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Needs your attention (2 Columns Wide on Desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-4">
              Needs your attention
            </h3>

            {/* Table Header */}
            <div className="bg-[#f0f3f8] rounded-md px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Task</span>
              <span>Action</span>
            </div>

            {/* Tasks List */}
            <div className="divide-y divide-gray-100">
              {attentionTasks.length > 0 ? (
                attentionTasks.map((t) => (
                  <div
                    key={t.id}
                    className="py-3.5 px-2 sm:px-4 flex items-center justify-between gap-4 text-xs sm:text-sm"
                  >
                    <span className="font-medium text-gray-900 leading-snug">{t.task}</span>
                    <Link
                      href={t.href}
                      className="font-semibold text-gray-900 hover:text-[var(--brand-primary)] hover:underline transition-colors shrink-0"
                    >
                      {t.action}
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  All caught up! No urgent tasks require your attention.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Available balance (1 Column Wide) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Available balance</h3>
            <p className="text-3xl sm:text-4xl font-bold text-gray-950 tracking-tight my-2">
              GBP {formatGBP(availableBalance)}
            </p>
            <p className="text-xs text-gray-400 font-normal">
              Pending GBP {formatGBP(pendingBalance)} / Paid out GBP {formatGBP(paidOutBalance)}
            </p>
          </div>

          <div className="mt-8 pt-2">
            <button
              onClick={() => router.push("/seller/earnings")}
              className="w-full sm:w-auto inline-block text-center border border-gray-300 rounded-lg px-6 py-2.5 text-xs sm:text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              View earnings
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Store connection & Grow your store ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Store connection (2 Columns Wide on Desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
              Store connection
            </h3>

            {/* Connection Status Pill Badge */}
            <div className="mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border ${
                  isStoreConnected
                    ? "bg-[#eaf5ea] text-[#1e7e34] border-[#c8e6c9]"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {storeTypeDisplay}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs text-gray-500 font-normal">
              Last success: {formatRelativeTime(storeConnection?.lastSyncedAt)} |{" "}
              {storeConnection?.itemsNeedingReview && storeConnection.itemsNeedingReview > 0
                ? `${storeConnection.itemsNeedingReview} item needs review`
                : "Catalog synchronized"}
            </p>

            <button
              onClick={() => router.push("/seller/integrations")}
              className="border border-gray-300 rounded-lg px-5 py-2 text-xs sm:text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition shadow-xs self-start sm:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Review sync
            </button>
          </div>
        </div>

        {/* Right: Grow your store (1 Column Wide) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-4">
              Grow your store
            </h3>
          </div>

          <div className="mt-4 pt-2">
            <button
              onClick={() => router.push("/seller/products")}
              className="w-full sm:w-auto inline-block text-center bg-[#e62e43] hover:bg-[#cf2337] text-white rounded-lg px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Create promotion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
