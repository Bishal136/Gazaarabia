"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { orderService } from "@/lib/services/front-end/orderService";
import Loader from "@/components/Loader";
import Link from "next/link";
import Image from "next/image";
import { Package, ShoppingBag, ChevronRight, AlertCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product?: {
    id: number;
    title: string;
    productimage?: { url: string }[];
  } | null;
  selectedVariantData?: any;
}

interface Order {
  id: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  platform?: string | null;
  createdAt: string;
  orderItems: OrderItem[];
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace(ROUTES.USER.LOGIN);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const token = session?.user?.token;

    (async () => {
      try {
        setErrorMessage(null);
        const res = await orderService.getAll(token);
        if (isMounted) {
          const list = Array.isArray(res?.data) ? res.data : [];
          setOrders(
            list.sort(
              (a: Order, b: Order) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        }
      } catch (error: any) {
        console.error("Failed to fetch orders:", error);
        if (isMounted) {
          setOrders([]);
          setErrorMessage(error?.message || "Failed to load orders. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [status, session, router]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center min-h-[300px]">
        <Loader />
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusBadge = (rawStatus?: string) => {
    const normalized = (rawStatus || "pending").toLowerCase().trim();
    const base = "px-3 py-1 text-xs font-medium rounded-full capitalize border";

    if (normalized === "completed" || normalized === "delivered") {
      return (
        <span className={`${base} bg-green-50 text-green-700 border-green-200`}>
          {rawStatus || "Completed"}
        </span>
      );
    }
    if (normalized === "pending" || normalized === "processing") {
      return (
        <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}>
          {rawStatus || "Pending"}
        </span>
      );
    }
    if (normalized === "cancelled" || normalized === "refunded") {
      return (
        <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
          {rawStatus || "Cancelled"}
        </span>
      );
    }

    return (
      <span className={`${base} bg-gray-100 text-gray-700 border-gray-200`}>
        {rawStatus || normalized}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-1 sm:px-4 pt-1 pb-10">
      {/* PAGE HEADER */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0a0808] tracking-tight">
            My Orders
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Review your recent purchases and order history
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ORDERS WRAPPER */}
      <div className="bg-white border border-[#e8d5c8]/80 rounded-2xl shadow-sm p-4 md:p-6">
        {/* EMPTY STATE */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#e8d5c8]/30 flex items-center justify-center mb-4">
              <ShoppingBag size={32} className="text-[#b08a78]" />
            </div>
            <h3 className="text-lg font-bold text-[#0a0808] mb-1">
              You have no orders yet
            </h3>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm">
              Explore our collection of authentic products and your orders will show up here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#b08a78] text-white rounded-full font-medium hover:bg-[#967262] transition shadow-sm"
            >
              <ShoppingBag size={18} />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-7">
            {orders.map((order) => (
              <div
                key={order.id}
                className="group border border-[var(--soft-gray)] rounded-xl p-4 md:p-6 hover:shadow-md hover:border-[#b08a78] transition-all duration-300 bg-white"
              >
                {/* ORDER HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-5 gap-2 md:gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg md:text-xl text-[#0a0808] leading-tight">
                      Order #{order.id}
                    </h3>
                    <p className="text-[var(--text-muted)] text-xs md:text-sm mt-0.5">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {statusBadge(order.status)}
                    <span className="font-bold text-[#b08a78] text-base md:text-lg">
                      £{Number(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* PRODUCT SCROLLER */}
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                  {(order.orderItems || []).map((item, idx) => {
                    const imageUrl =
                      item?.selectedVariantData?.variantImages?.[0]?.url ||
                      item?.product?.productimage?.[0]?.url;

                    return (
                      <div
                        key={item.id || idx}
                        className="relative w-20 md:w-24 aspect-square rounded-lg overflow-hidden border border-[var(--soft-gray)] bg-gray-50 flex-shrink-0 group-hover:border-[#b08a78]/50 transition"
                      >
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item?.product?.title || "Product"}
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <Package size={26} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* FOOTER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-4 pt-3 border-t border-gray-100 gap-3">
                  <div className="text-[var(--text-muted)] text-xs md:text-sm leading-relaxed">
                    Payment Method: <span className="font-medium text-gray-700">{order.paymentMethod || "Online"}</span>
                    {order.platform && ` (${order.platform})`}
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs md:text-sm font-medium bg-[#b08a78] text-white rounded-full hover:bg-[#967262] transition shadow-sm"
                  >
                    View Details
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
