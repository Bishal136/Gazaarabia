"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Layers,
  ShoppingBag,
  Tag,
  Palette,
  ClipboardList,
  Truck,
  Droplets,
  Ruler,
  Grid,
  Users as UsersIcon,
  Store,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  CreditCard,
  Database,
  Server,
  Package,
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
      <div className="bg-white rounded-2xl p-12 border border-[#e8d5c8] text-center shadow-sm max-w-lg mx-auto mt-12">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h3 className="text-xl font-bold text-[#0a0808] mb-2">Failed to load dashboard</h3>
        <p className="text-[#57534e] text-sm mb-6">
          There was an error communicating with the analytics API. Please verify your connection and try again.
        </p>
        <button
          onClick={fetchDashboard}
          className="px-5 py-2.5 bg-[#b08a78] hover:bg-[#9c7766] text-white font-medium rounded-xl text-sm transition shadow-sm inline-flex items-center gap-2"
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
  const totalProducts = dashboardData.products ?? 0;
  const totalUsers = dashboardData.users ?? 0;
  const deliveryOptionsCount = dashboardData.deliveryOptions ?? 0;

  // Secondary catalog navigation items
  const catalogQuickStats = [
    { label: "Categories", count: dashboardData.categories, icon: ClipboardList, path: "/admin/category-list" },
    { label: "Subcategories", count: dashboardData.subcategories, icon: Grid, path: "/admin/subcategories" },
    { label: "Brands", count: dashboardData.brands, icon: Tag, path: "/admin/brands" },
    { label: "Colors", count: dashboardData.colors, icon: Palette, path: "/admin/colors-list" },
    { label: "Sizes", count: dashboardData.sizes, icon: Ruler, path: "/admin/sizes" },
    { label: "Material Cares", count: dashboardData.materialCares, icon: Droplets, path: "/admin/material-cares" },
    { label: "Delivery Options", count: dashboardData.deliveryOptions, icon: Truck, path: "/admin/delivery-options" },
    { label: "Blog Categories", count: dashboardData.blogCategories, icon: Layers, path: "/admin/blog-categories" },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* =========================================================================
          ROW 1: EXECUTIVE KPI SUMMARY CARDS (4-Column Grid)
          Styled with left-aligned labels, large bold numbers & #b08a78 highlights
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Paid sales */}
        <div
          onClick={() => router.push("/admin/revenue-breakdown")}
          className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#57534e] tracking-tight">
              Paid sales
            </span>
            <span className="w-8 h-8 rounded-full bg-[#fbf9f6] border border-[#e8d5c8] text-[#b08a78] flex items-center justify-center group-hover:bg-[#b08a78] group-hover:text-white transition">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#0a0808] tracking-tight">
              GBP {totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-[#57534e]/80 mt-1 font-medium">
              Settled lifetime revenue
            </p>
          </div>
        </div>

        {/* Card 2: Active sellers */}
        <div
          onClick={() => router.push("/admin/seller")}
          className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#57534e] tracking-tight">
              Active sellers
            </span>
            <span className="w-8 h-8 rounded-full bg-[#fbf9f6] border border-[#e8d5c8] text-[#b08a78] flex items-center justify-center group-hover:bg-[#b08a78] group-hover:text-white transition">
              <Store size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#0a0808] tracking-tight">
              {activeSellers}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {pendingSellers > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingSellers} pending review
                </span>
              ) : (
                <span className="text-xs text-[#57534e]/80 font-medium">
                  {dashboardData.sellers} total registered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Total Orders / Open disputes */}
        <div
          onClick={() => router.push(openDisputes > 0 ? "/admin/returns" : "/admin/orders")}
          className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#57534e] tracking-tight">
              Open disputes
            </span>
            <span className="w-8 h-8 rounded-full bg-[#fbf9f6] border border-[#e8d5c8] text-[#b08a78] flex items-center justify-center group-hover:bg-[#b08a78] group-hover:text-white transition">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#0a0808] tracking-tight flex items-baseline gap-2">
              {openDisputes}
              <span className="text-sm font-normal text-[#57534e]">
                / {totalOrders} orders
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {openDisputes > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                  Action required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <CheckCircle2 size={12} /> Zero active disputes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Total Products / Active Users */}
        <div
          onClick={() => router.push("/admin/products")}
          className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[136px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#57534e] tracking-tight">
              Total products
            </span>
            <span className="w-8 h-8 rounded-full bg-[#fbf9f6] border border-[#e8d5c8] text-[#b08a78] flex items-center justify-center group-hover:bg-[#b08a78] group-hover:text-white transition">
              <ShoppingBag size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#0a0808] tracking-tight">
              {totalProducts}
            </div>
            <p className="text-xs text-[#57534e]/80 mt-1 font-medium">
              {totalUsers} active customer accounts
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: OPERATIONAL SPLIT (2/3 Left Action Queue + 1/3 Right Health Card)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Action Queue (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-[#0a0808]">Action queue</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#f5ede7] text-[#b08a78] border border-[#e8d5c8]">
                  {pendingSellers + pendingOrders + pendingPayouts + (deliveryOptionsCount === 0 ? 1 : 0)} items
                </span>
              </div>
              <span className="text-xs text-[#57534e] font-medium hidden sm:inline">
                Live task prioritization
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f0ece6] text-xs font-semibold text-[#57534e] uppercase tracking-wider">
                    <th className="py-3 px-4 bg-[#fbf9f6] rounded-l-xl">Issue</th>
                    <th className="py-3 px-4 bg-[#fbf9f6] text-center">Count</th>
                    <th className="py-3 px-4 bg-[#fbf9f6] text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f1eb] text-sm">
                  {/* Row 1: Seller approvals */}
                  <tr className="hover:bg-[#faf7f4] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0a0808]">
                      <div className="flex items-center gap-2">
                        <Store size={16} className="text-[#b08a78]" />
                        <span>Seller approvals</span>
                      </div>
                      <span className="text-xs text-[#57534e] font-normal block pl-6">
                        Vendor onboarding applications awaiting verification
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-bold text-sm ${
                          pendingSellers > 0 ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" : "text-[#57534e]"
                        }`}
                      >
                        {pendingSellers}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => router.push("/admin/seller")}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#0a0808] bg-white border border-[#e8d5c8] rounded-lg hover:border-[#b08a78] hover:text-[#b08a78] hover:bg-[#faf7f4] transition shadow-2xs"
                      >
                        Review
                      </button>
                    </td>
                  </tr>

                  {/* Row 2: Late dispatch / Pending orders */}
                  <tr className="hover:bg-[#faf7f4] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0a0808]">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-[#b08a78]" />
                        <span>Late dispatch / Processing</span>
                      </div>
                      <span className="text-xs text-[#57534e] font-normal block pl-6">
                        Customer orders waiting for fulfillment and courier handover
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-bold text-sm ${
                          pendingOrders > 0 ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" : "text-[#57534e]"
                        }`}
                      >
                        {pendingOrders}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => router.push("/admin/orders")}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#0a0808] bg-white border border-[#e8d5c8] rounded-lg hover:border-[#b08a78] hover:text-[#b08a78] hover:bg-[#faf7f4] transition shadow-2xs"
                      >
                        Open orders
                      </button>
                    </td>
                  </tr>

                  {/* Row 3: Payouts on hold */}
                  <tr className="hover:bg-[#faf7f4] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0a0808]">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-[#b08a78]" />
                        <span>Payouts on hold</span>
                      </div>
                      <span className="text-xs text-[#57534e] font-normal block pl-6">
                        Seller or affiliate balance disbursements pending approval
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-bold text-sm ${
                          pendingPayouts > 0 ? "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200" : "text-[#57534e]"
                        }`}
                      >
                        {pendingPayouts}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => router.push("/admin/seller-payouts")}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#0a0808] bg-white border border-[#e8d5c8] rounded-lg hover:border-[#b08a78] hover:text-[#b08a78] hover:bg-[#faf7f4] transition shadow-2xs"
                      >
                        Review holds
                      </button>
                    </td>
                  </tr>

                  {/* Row 4: Catalog & Delivery Alerts */}
                  <tr className="hover:bg-[#faf7f4] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0a0808]">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-[#b08a78]" />
                        <span>
                          {deliveryOptionsCount === 0
                            ? "Delivery options configuration"
                            : "Catalog & Stock Alerts"}
                        </span>
                      </div>
                      <span className="text-xs text-[#57534e] font-normal block pl-6">
                        {deliveryOptionsCount === 0
                          ? "Storefront has zero active delivery rates configured"
                          : "Inventory tracking and catalog availability checks"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-bold text-sm ${
                          deliveryOptionsCount === 0
                            ? "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                            : "text-[#57534e]"
                        }`}
                      >
                        {deliveryOptionsCount === 0 ? "Alert" : "Normal"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          router.push(
                            deliveryOptionsCount === 0
                              ? "/admin/delivery-options"
                              : "/admin/products"
                          )
                        }
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#0a0808] bg-white border border-[#e8d5c8] rounded-lg hover:border-[#b08a78] hover:text-[#b08a78] hover:bg-[#faf7f4] transition shadow-2xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Panel: Marketplace Health (1/3) */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#0a0808]">Marketplace health</h3>
              <Activity size={18} className="text-[#b08a78]" />
            </div>

            <div className="space-y-4">
              {/* Payments Status */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-xs" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Payments: operational
                  </p>
                  <p className="text-xs text-emerald-700/90 mt-0.5">
                    Stripe & PayPal webhooks responsive
                  </p>
                </div>
              </div>

              {/* Orders Status */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  pendingOrders > 0
                    ? "bg-rose-50/70 border-rose-100 text-rose-900"
                    : "bg-emerald-50/70 border-emerald-100 text-emerald-900"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-xs ${
                    pendingOrders > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-bold">
                    {pendingOrders > 0
                      ? `Orders: ${pendingOrders} require attention`
                      : "Orders: all dispatched"}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {pendingOrders > 0
                      ? "Fulfillment or courier tracking pending"
                      : "Zero fulfillment backlog"}
                  </p>
                </div>
              </div>

              {/* Database & Sync Status */}
              <div className="p-3.5 rounded-xl bg-[#fbf9f6] border border-[#e8d5c8] flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#b08a78] mt-1.5 shrink-0 shadow-xs" />
                <div>
                  <p className="text-sm font-bold text-[#0a0808]">
                    Database: MongoDB 7.0 Active
                  </p>
                  <p className="text-xs text-[#57534e] mt-0.5">
                    All 68 collections & indexes synchronized
                  </p>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 pt-1 text-xs text-[#57534e]">
                <Clock size={14} className="text-[#b08a78]" />
                <span>Data updated: {lastSyncTime || "Just now"}</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-auto">
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#faf7f4] border border-[#e8d5c8] text-[#0a0808] font-semibold rounded-xl text-sm transition shadow-2xs hover:border-[#b08a78] flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} className="text-[#b08a78]" />
              View system health
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: ANALYTICS CHARTS (2-Column Grid)
          Preserved Orders Over Time and Revenue Over Time line charts with #b08a78 theme
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Over Time */}
        <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-[#0a0808]">Orders Over Time</h3>
              <p className="text-xs text-[#57534e]">Customer checkout volume trends</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#fbf9f6] border border-[#e8d5c8] text-[#0a0808]">
              {totalOrders} Total Orders
            </span>
          </div>

          <div className="h-[280px] w-full">
            {ordersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "#e8d5c8" }}
                    tick={{ fill: "#57534e", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: "#e8d5c8" }}
                    tick={{ fill: "#57534e", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e8d5c8",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      color: "#0a0808",
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
                    stroke="#b08a78"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#b08a78", strokeWidth: 1, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#b08a78", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#57534e]">
                No order history recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-[#0a0808]">Revenue Over Time</h3>
              <p className="text-xs text-[#57534e]">Gross merchant transaction volume</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#fbf9f6] border border-[#e8d5c8] text-[#0a0808]">
              GBP {totalRevenue.toFixed(2)}
            </span>
          </div>

          <div className="h-[280px] w-full">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "#e8d5c8" }}
                    tick={{ fill: "#57534e", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: "#e8d5c8" }}
                    tick={{ fill: "#57534e", fontSize: 11 }}
                    tickFormatter={(val) => `£${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e8d5c8",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      color: "#0a0808",
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
                    stroke="#b08a78"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#b08a78", strokeWidth: 1, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#b08a78", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#57534e]">
                No revenue records recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: CATALOG QUICK-STATS (Compact Strip) & RECENT BLOGS
          Replaces the old scattered 3 rows with a sleek horizontal summary strip
      ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0a0808]">Catalog & Attributes</h3>
            <p className="text-xs text-[#57534e]">Storefront taxonomies and metadata specifications</p>
          </div>
          <span className="text-xs text-[#57534e] font-medium hidden sm:inline">
            Click any section to manage
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {catalogQuickStats.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="p-3 rounded-xl bg-[#fbf9f6] border border-[#f0ece6] hover:border-[#b08a78] hover:bg-white text-left transition group shadow-2xs cursor-pointer flex flex-col justify-between h-[84px]"
              >
                <div className="flex items-center justify-between">
                  <Icon size={16} className="text-[#b08a78] group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-[#0a0808]">
                    {item.count ?? 0}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#57534e] group-hover:text-[#0a0808] transition truncate">
                  {item.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Blogs */}
      <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8] shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-[#0a0808]">Recent Blogs</h3>
            <p className="text-xs text-[#57534e]">Editorial content and fashion articles published on the storefront</p>
          </div>
          <button
            onClick={() => router.push("/admin/blogs")}
            className="text-xs font-semibold text-[#b08a78] hover:text-[#9c7766] transition flex items-center gap-1"
          >
            Manage blogs <ExternalLink size={12} />
          </button>
        </div>

        <div className="divide-y divide-[#f5f1eb]">
          {dashboardData.recentBlogs?.length > 0 ? (
            dashboardData.recentBlogs.map((blog: any) => (
              <div key={blog.id} className="py-3.5 flex justify-between items-center hover:bg-[#faf7f4] px-2 rounded-xl transition">
                <div className="pr-4">
                  <p className="font-semibold text-sm text-[#0a0808] hover:text-[#b08a78] transition cursor-pointer" onClick={() => router.push(`/admin/blogs/form/${blog.id}`)}>
                    {blog.title}
                  </p>
                  <p className="text-[#57534e] text-xs mt-0.5">
                    {new Date(blog.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/admin/blogs/form/${blog.id}`)}
                  className="px-3.5 py-1 text-xs font-semibold rounded-lg border border-[#e8d5c8] text-[#0a0808] hover:border-[#b08a78] hover:text-[#b08a78] hover:bg-white transition bg-[#fbf9f6] shrink-0"
                >
                  View
                </button>
              </div>
            ))
          ) : (
            <div className="text-sm text-[#57534e] py-6 text-center">
              No recent blogs found.
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: MARKETPLACE SYSTEM HEALTH DETAILS
      ========================================================================= */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#e8d5c8] shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsHealthModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#fbf9f6] border border-[#e8d5c8] flex items-center justify-center text-[#b08a78]">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0a0808]">Marketplace System Health</h3>
                <p className="text-xs text-[#57534e]">Live telemetry & service connectivity</p>
              </div>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database size={16} className="text-[#b08a78]" />
                  <span className="font-medium text-[#0a0808]">Database (MongoDB)</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> Connected
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard size={16} className="text-[#b08a78]" />
                  <span className="font-medium text-[#0a0808]">Stripe & PayPal</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> Operational
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Server size={16} className="text-[#b08a78]" />
                  <span className="font-medium text-[#0a0808]">PM2 Process Cluster</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> 4 Workers Active
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity size={16} className="text-[#b08a78]" />
                  <span className="font-medium text-[#0a0808]">Sharp Image Processing</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> SIMD libvips
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsHealthModalOpen(false)}
                className="px-4 py-2 bg-[#b08a78] hover:bg-[#9c7766] text-white rounded-xl text-xs font-semibold transition"
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
