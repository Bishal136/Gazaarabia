"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign,
  ClipboardCheck,
  Tag,
  Wallet,
  Users,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROUTES } from "@/constants/routes";
import Loader from "@/components/Loader";
import AlertMessage from "@/components/AlertMessage";
import { affiliateService } from "@/lib/services/affiliateService";
import { OrderDetailsModal } from "@/components/affiliate/OrderDetailsModal";

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  //  Format money
  const formatGBP = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  //  Status pill color
  const getStatusClass = (orderStatus: string) => {
    switch ((orderStatus || "").toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.AFFILIATE.LOGIN);
      return;
    }
    if (session?.user?.role !== "affiliate") {
      router.replace(ROUTES.HOME);
    }
  }, [status, session?.user?.role, router]);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await affiliateService.getDashboard(token);
      setDashboardData(res.data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "affiliate") return;
    if (!token) {
      setLoading(false);
      return;
    }
    fetchDashboard();
  }, [status, session?.user?.role, token, fetchDashboard]);

  if (status === "loading" || loading) return <Loader />;

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <AlertMessage type="error" message={error} />
        <button
          type="button"
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#c32230] transition"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="p-6 text-center text-gray-500">No dashboard data available.</div>;
  }

  // Top-level combined summary cards
  const combinedStats = [
    {
      label: "Total Combined Earnings",
      value: formatGBP(dashboardData.totalCombinedEarnings ?? 0),
      icon: <DollarSign size={28} />,
      color: "text-green-600",
    },
    {
      label: "Pending Combined",
      value: formatGBP(dashboardData.pendingCombinedPayouts ?? 0),
      icon: <Wallet size={28} />,
      color: "text-yellow-600",
    },
    {
      label: "Total (Orders + Items)",
      value: (dashboardData.totalOrders ?? 0) + (dashboardData.totalAmbassadorItems ?? 0),
      icon: <ClipboardCheck size={28} />,
      color: "text-blue-600",
    },
    {
      label: "Referred Customers",
      value: dashboardData.referredCustomers ?? 0,
      icon: <Users size={28} />,
      color: "text-orange-600",
    },
  ];

  const affiliateStats = [
    { label: "Affiliate Earnings", value: formatGBP(dashboardData.totalAffiliateEarnings ?? 0), icon: <DollarSign size={28} />, color: "text-green-600" },
    { label: "Pending Payouts", value: formatGBP(dashboardData.pendingAffiliatePayouts ?? 0), icon: <Wallet size={28} />, color: "text-yellow-600" },
    { label: "Total Orders", value: dashboardData.totalOrders ?? 0, icon: <ClipboardCheck size={28} />, color: "text-blue-600" },
    { label: "Active Coupons", value: dashboardData.activeCoupons ?? 0, icon: <Tag size={28} />, color: "text-purple-600" },
  ];

  const ambassadorStats = [
    { label: "Ambassador Earnings", value: formatGBP(dashboardData.totalAmbassadorEarnings ?? 0), icon: <DollarSign size={28} />, color: "text-green-600" },
    { label: "Pending Ambassador", value: formatGBP(dashboardData.pendingAmbassadorPayouts ?? 0), icon: <Wallet size={28} />, color: "text-yellow-600" },
    { label: "Items Sold", value: dashboardData.totalAmbassadorItems ?? 0, icon: <ClipboardCheck size={28} />, color: "text-blue-600" },
  ];

  const recentOrders = dashboardData.recentOrders ?? [];
  const recentAmbassadorItems = dashboardData.recentAmbassadorItems ?? [];

  return (
    <div className="space-y-8 p-6">

      {/* Combined Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {combinedStats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5 shadow flex items-center gap-4">
            <div className={`${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-lg font-semibold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two sections side-by-side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Affiliate Section */}
        <div className="bg-white rounded-xl border p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Affiliate Summary</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {affiliateStats.map((st) => (
              <div key={st.label} className="p-4 rounded-md border">
                <p className="text-xs text-gray-500">{st.label}</p>
                <p className="text-lg font-semibold">{st.value}</p>
              </div>
            ))}
          </div>

          <h4 className="text-md font-medium mb-3">Recent Affiliate Orders</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                  <th className="px-5 py-3 text-left">Order ID</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? (
                  recentOrders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{order.orderId}</td>
                      <td className="px-5 py-3">{formatGBP(order.amount)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(order.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">No recent orders.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ambassador Section */}
        <div className="bg-white rounded-xl border p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Ambassador Summary</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {ambassadorStats.map((st) => (
              <div key={st.label} className="p-4 rounded-md border">
                <p className="text-xs text-gray-500">{st.label}</p>
                <p className="text-lg font-semibold">{st.value}</p>
              </div>
            ))}
          </div>

          <h4 className="text-md font-medium mb-3">Recent Ambassador Items</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                  <th className="px-5 py-3 text-left">Item ID</th>
                  <th className="px-5 py-3 text-left">Order</th>
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-left">Qty</th>
                  <th className="px-5 py-3 text-left">Earned</th>
                </tr>
              </thead>
              <tbody>
                {recentAmbassadorItems.length > 0 ? (
                  recentAmbassadorItems.map((it: any) => (
                    <tr key={it.itemId} className="border-b hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{it.itemId}</td>
                      <td className="px-5 py-3 text-gray-600">{it.orderId}</td>
                      <td className="px-5 py-3">{it.productTitle}</td>
                      <td className="px-5 py-3">{it.qty}</td>
                      <td className="px-5 py-3 font-semibold">£{Number(it.earned ?? 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">No recent ambassador activity.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/*  Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onViewReview={setSelectedReview}
          formatGBP={formatGBP}
          getStatusClass={getStatusClass}
        />
      )}

      {/* Review Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-white/95 rounded-2xl w-full max-w-md shadow-lg overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
              <h2 className="text-lg font-semibold text-gray-800">Customer Review</h2>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="text-gray-500 hover:text-[var(--brand-primary)] transition"
                aria-label="Close review modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill={star <= selectedReview.rating ? "#FACC15" : "#E5E7EB"}
                    className="w-5 h-5"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.959c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.064 9.386c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.285-3.959z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                “{selectedReview.comment || "No comment provided."}”
              </p>
              <div className="text-xs text-gray-500 border-t pt-3">
                <p>
                  <span className="font-medium text-gray-700">Reviewer:</span>{" "}
                  {selectedReview.user?.name || "Customer"}{" "}
                  {selectedReview.user?.email && (
                    <span className="text-gray-400">({selectedReview.user.email})</span>
                  )}
                </p>
                {selectedReview.createdAt && (
                  <p>
                    <span className="font-medium text-gray-700">Date:</span>{" "}
                    {new Date(selectedReview.createdAt).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
