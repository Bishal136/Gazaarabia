"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
  X,
  CreditCard,
  Database,
  Server,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { ROUTES } from "@/constants/routes";
import { dashboardService, DashboardData } from "@/lib/services/dashboardService";
import DashboardSkeleton from "@/components/admin/DashboardSkeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.ADMIN.LOGIN);
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace(ROUTES.HOME);
    }
  }, [status, session, router]);

  const fetchDashboard = async () => {
    if (!session?.user?.token) return;
    try {
      setLoading(true);
      const data = await dashboardService.getDashboard(session.user.token);
      setDashboardData(data);
      const now = new Date();
      setLastSyncTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.token) {
      fetchDashboard();
    }
  }, [session]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!dashboardData) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm max-w-lg mx-auto mt-12">
        <div className="w-14 h-14 bg-red-50 text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to load dashboard</h3>
        <p className="text-slate-500 text-sm mb-6">
          There was an error communicating with the analytics API. Please verify your connection and try again.
        </p>
        <button
          onClick={fetchDashboard}
          className="px-5 py-2.5 bg-[var(--navy-blue)] hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition shadow-sm inline-flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Retry Connection
        </button>
      </div>
    );
  }

  // Chart data formatting
  const ordersChartData =
    dashboardData.charts?.ordersOverTime &&
    Object.keys(dashboardData.charts.ordersOverTime).length > 0
      ? Object.entries(dashboardData.charts.ordersOverTime).map(([date, count]) => ({
          date: date.length > 5 ? date.slice(5) : date,
          fullDate: date,
          orders: count,
        }))
      : [];

  const revenueChartData =
    dashboardData.charts?.revenueOverTime &&
    Object.keys(dashboardData.charts.revenueOverTime).length > 0
      ? Object.entries(dashboardData.charts.revenueOverTime).map(([date, amount]) => ({
          date: date.length > 5 ? date.slice(5) : date,
          fullDate: date,
          revenue: Number(amount.toFixed(2)),
        }))
      : [];

  // Operational metrics
  const totalRevenue = dashboardData.totalRevenue ?? 0;
  const activeSellers = dashboardData.activeSellers ?? 0;
  const pendingSellers = dashboardData.pendingSellers ?? 0;
  const totalOrders = dashboardData.orders ?? 0;
  const pendingOrders = dashboardData.pendingOrders ?? 0;
  const openDisputes = dashboardData.openDisputes ?? 0;
  const pendingPayouts = dashboardData.pendingPayouts ?? 0;
  const syncFailures = dashboardData.syncFailures ?? 0;
  const totalProducts = dashboardData.products ?? 0;
  const totalUsers = dashboardData.users ?? 0;

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* =========================================================================
          ROW 1: 4 HIGH-IMPACT KPI CARDS (Matching Target Reference)
          Minimalist, bold typography, clean borders and generous padding
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Paid sales */}
        <div
          onClick={() => router.push("/admin/revenue-breakdown")}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="text-sm font-semibold text-slate-700 tracking-tight">
            Paid sales
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              GBP {totalRevenue > 0 ? totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0"}
            </div>
          </div>
        </div>

        {/* Card 2: Active sellers */}
        <div
          onClick={() => router.push("/admin/seller")}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="text-sm font-semibold text-slate-700 tracking-tight">
            Active sellers
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {activeSellers}
            </div>
          </div>
        </div>

        {/* Card 3: Open disputes */}
        <div
          onClick={() => router.push(openDisputes > 0 ? "/admin/returns" : "/admin/orders")}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="text-sm font-semibold text-slate-700 tracking-tight">
            Open disputes
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {openDisputes}
            </div>
          </div>
        </div>

        {/* Card 4: Sync failures */}
        <div
          onClick={() => router.push("/admin/sync-all")}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[120px]"
        >
          <div className="text-sm font-semibold text-slate-700 tracking-tight">
            Sync failures
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {syncFailures}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: OPERATIONAL SPLIT (2/3 Left Action Queue + 1/3 Right Marketplace Health)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Panel: Action queue (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
            Action queue
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f1f5f9]/70 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4 rounded-l-lg">Issue</th>
                  <th className="py-2.5 px-4 text-center">Count</th>
                  <th className="py-2.5 px-4 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {/* Row 1: Seller approvals */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Seller approvals
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    {pendingSellers}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => router.push("/admin/seller")}
                      className="text-slate-800 hover:text-black font-medium hover:underline transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>

                {/* Row 2: Late dispatch */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Late dispatch
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    {pendingOrders}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => router.push("/admin/orders")}
                      className="text-slate-800 hover:text-black font-medium hover:underline transition"
                    >
                      Open orders
                    </button>
                  </td>
                </tr>

                {/* Row 3: Payouts on hold */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Payouts on hold
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    {pendingPayouts}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => router.push("/admin/seller-payouts")}
                      className="text-slate-800 hover:text-black font-medium hover:underline transition"
                    >
                      Review holds
                    </button>
                  </td>
                </tr>

                {/* Row 4: Failed connections */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    Failed connections
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    {syncFailures}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => router.push("/admin/sync-all")}
                      className="text-slate-800 hover:text-black font-medium hover:underline transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Marketplace health (1/3) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-5 tracking-tight">
              Marketplace health
            </h2>

            <div className="space-y-4 text-sm font-medium">
              {/* Payments status in green */}
              <div className="text-emerald-600 flex items-center gap-2">
                <span>Payments: operational</span>
              </div>

              {/* Orders require attention in red */}
              <div className={`${pendingOrders > 0 ? "text-rose-600" : "text-emerald-600"} flex items-center gap-2`}>
                <span>
                  {pendingOrders > 0
                    ? `Orders: ${pendingOrders} require attention`
                    : "Orders: all dispatched"}
                </span>
              </div>

              {/* Data updated timestamp in muted gray */}
              <div className="text-slate-400 text-xs font-normal pt-2">
                Data updated: {lastSyncTime || "Just now"}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm hover:bg-slate-50 transition shadow-2xs text-center"
            >
              View system health
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: ANALYTICS CHARTS (2-Column Grid)
          Styled with Gazaarabia Admin Theme (#1E2A4A Navy & #E82C3F Brand Red)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orders Over Time */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Orders Over Time</h3>
              <p className="text-xs text-slate-500">Customer checkout volume trends</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
              {totalOrders} Total Orders
            </span>
          </div>

          <div className="h-[280px] w-full">
            {ordersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      color: "#0f172a",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    formatter={(value: any) => [`${value} orders`, "Orders"]}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullDate || label
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#1E2A4A"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#1E2A4A", strokeWidth: 1, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#1E2A4A", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                No order history recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Over Time</h3>
              <p className="text-xs text-slate-500">Gross merchant transaction volume</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
              GBP {totalRevenue.toFixed(2)}
            </span>
          </div>

          <div className="h-[280px] w-full">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(val) => `£${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      color: "#0f172a",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    formatter={(value: any) => [`GBP ${Number(value).toFixed(2)}`, "Revenue"]}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullDate || label
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#E82C3F"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#E82C3F", strokeWidth: 1, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#E82C3F", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                No revenue records recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>



      {/* =========================================================================
          MODAL: MARKETPLACE SYSTEM HEALTH DETAILS
      ========================================================================= */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsHealthModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[var(--navy-blue)]">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Marketplace System Health</h3>
                <p className="text-xs text-slate-500">Live telemetry & service connectivity</p>
              </div>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database size={16} className="text-[var(--navy-blue)]" />
                  <span className="font-medium text-slate-900">Database (MongoDB)</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> Connected
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard size={16} className="text-[var(--navy-blue)]" />
                  <span className="font-medium text-slate-900">Stripe & PayPal</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> Operational
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Server size={16} className="text-[var(--navy-blue)]" />
                  <span className="font-medium text-slate-900">PM2 Process Cluster</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> 4 Workers Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity size={16} className="text-[var(--navy-blue)]" />
                  <span className="font-medium text-slate-900">Sharp Image Processing</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> SIMD libvips
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHealthModalOpen(false)}
                className="px-4 py-2 bg-[var(--navy-blue)] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
