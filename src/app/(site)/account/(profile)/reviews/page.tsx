"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Package,
  Calendar,
  ExternalLink,
  Edit3,
  Trash2,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Play,
  X,
  Maximize2,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import AlertMessage from "@/components/AlertMessage";
import ReviewModal from "@/components/ReviewModal";
import { reviewService } from "@/lib/services/front-end/reviewService";
import { ROUTES } from "@/constants/routes";

interface ToBeReviewedItem {
  id: number;
  orderId: number;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  productId: number;
  variantId?: number | null;
  price: number;
  quantity: number;
  product: {
    id: number;
    title: string;
    slug: string;
    image: string;
    sellingPrice: number;
  };
  variant?: {
    id: number;
    sku?: string | null;
    colorName?: string | null;
    sizeName?: string | null;
    image?: string | null;
  } | null;
}

interface ReviewHistoryItem {
  id: number;
  rating: number;
  comment: string;
  images: string[];
  image?: string | null;
  video?: string | null;
  createdAt: string;
  updatedAt: string;
  productId: number;
  variantId?: number | null;
  orderItemId?: number | null;
  sellerReply?: string | null;
  sellerRepliedAt?: string | null;
  sellerReplyShopName?: string | null;
  product: {
    id: number;
    title: string;
    slug: string;
    image: string;
  };
  variant?: {
    id: number;
    sku?: string | null;
    colorName?: string | null;
    sizeName?: string | null;
    image?: string | null;
  } | null;
}

export default function CustomerReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [toBeReviewed, setToBeReviewed] = useState<ToBeReviewedItem[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState<{
    isEdit: boolean;
    productId: number;
    productTitle: string;
    productImage: string;
    variantDetails?: any;
    orderItemId?: number;
    variantId?: number | null;
    reviewId?: number;
    rating?: number;
    comment?: string;
    images?: string[];
    video?: string | null;
  } | null>(null);

  // Photo Lightbox modal
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch reviews data
  const fetchData = useCallback(async () => {
    if (!session?.user?.token) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await reviewService.getMyReviews(session.user.token);
      if (res?.success) {
        setToBeReviewed(res.toBeReviewed || []);
        setReviewHistory(res.reviewHistory || []);
      }
    } catch (err: any) {
      console.error("Failed to load customer reviews:", err);
      setErrorMessage(err?.message || "Failed to load reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.USER.LOGIN);
      return;
    }
    fetchData();
  }, [status, router, fetchData]);

  // Open Create Review Modal
  const handleOpenCreate = (item: ToBeReviewedItem) => {
    setSelectedReviewItem({
      isEdit: false,
      productId: item.productId,
      productTitle: item.product?.title || "Product",
      productImage: item.variant?.image || item.product?.image || "/placeholder.png",
      variantDetails: item.variant,
      orderItemId: item.id,
      variantId: item.variantId,
    });
    setModalOpen(true);
  };

  // Open Edit Review Modal
  const handleOpenEdit = (rev: ReviewHistoryItem) => {
    setSelectedReviewItem({
      isEdit: true,
      productId: rev.productId,
      productTitle: rev.product?.title || "Product",
      productImage: rev.variant?.image || rev.product?.image || "/placeholder.png",
      variantDetails: rev.variant,
      reviewId: rev.id,
      orderItemId: rev.orderItemId || undefined,
      variantId: rev.variantId,
      rating: rev.rating,
      comment: rev.comment,
      images: rev.images || [],
      video: rev.video || null,
    });
    setModalOpen(true);
  };

  // Handle Delete Review
  const handleDeleteReview = async (id: number) => {
    if (!session?.user?.token) return;
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      setDeletingId(id);
      await reviewService.remove(session.user.token, id);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && toBeReviewed.length === 0 && reviewHistory.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-1 sm:px-4 pt-1 pb-12 space-y-6 animate-pulse">
        <div>
          <div className="h-8 w-44 bg-stone-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-stone-100 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-3">
              <div className="h-4 w-48 bg-stone-200 rounded"></div>
              <div className="h-3 w-32 bg-stone-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-1 sm:px-4 pt-1 pb-12">
      {/* PAGE HEADER */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0a0808] tracking-tight">
            My Reviews
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Rate your delivered orders, manage your feedback, and upload product photos & videos
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchData}
            className="text-xs underline font-semibold hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-3 border-b border-[#e8d5c8]/80 mb-6 pb-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
            activeTab === "pending"
              ? "bg-[#b08a78] text-white shadow-sm"
              : "text-gray-600 hover:text-black hover:bg-gray-100"
          }`}
        >
          <span>To Be Reviewed</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === "pending"
                ? "bg-white/20 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {toBeReviewed.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
            activeTab === "history"
              ? "bg-[#b08a78] text-white shadow-sm"
              : "text-gray-600 hover:text-black hover:bg-gray-100"
          }`}
        >
          <span>Review History</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === "history"
                ? "bg-white/20 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {reviewHistory.length}
          </span>
        </button>
      </div>

      {/* TAB 1: TO BE REVIEWED */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {toBeReviewed.length === 0 ? (
            <div className="bg-white border border-[#e8d5c8]/80 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#0a0808]">All Caught Up!</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
                You have reviewed all your delivered purchases. When a new order arrives, it will appear here for you to review.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b08a78] text-white text-xs sm:text-sm font-semibold hover:bg-[#976f5d] transition shadow-sm"
                >
                  <ShoppingBag size={16} />
                  <span>Explore Products</span>
                </Link>
                <Link
                  href="/account/orders"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 transition"
                >
                  <Package size={16} />
                  <span>View All Orders</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {toBeReviewed.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#e8d5c8]/80 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#b08a78]/60 transition"
                >
                  {/* Left: Product & Order details */}
                  <div className="flex items-start gap-4 flex-1">
                    <Link
                      href={item.product?.slug ? `/products/${item.product.slug}` : "#"}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 group"
                    >
                      <Image
                        src={item.variant?.image || item.product?.image || "/placeholder.png"}
                        alt={item.product?.title || "Product"}
                        fill
                        sizes="96px"
                        className="object-contain p-1 group-hover:scale-105 transition-transform"
                      />
                    </Link>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1 font-mono font-medium bg-gray-100 px-2 py-0.5 rounded-md text-gray-700">
                          <Package size={12} />
                          Order {item.orderNumber}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(item.orderDate)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                          Delivered
                        </span>
                      </div>

                      <Link
                        href={item.product?.slug ? `/products/${item.product.slug}` : "#"}
                        className="block font-semibold text-sm sm:text-base text-[#0a0808] hover:text-[#b08a78] transition line-clamp-2"
                      >
                        {item.product?.title}
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-gray-600">
                        {item.variant?.colorName && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[11px]">
                            Color: <strong className="text-gray-800">{item.variant.colorName}</strong>
                          </span>
                        )}
                        {item.variant?.sizeName && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[11px]">
                            Size: <strong className="text-gray-800">{item.variant.sizeName}</strong>
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400">
                          Qty: {item.quantity} &bull; ${Number(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Write Review Action */}
                  <div className="flex md:flex-col items-center justify-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <button
                      onClick={() => handleOpenCreate(item)}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#b08a78] hover:bg-[#976f5d] text-white text-xs sm:text-sm font-semibold transition shadow-sm active:scale-98"
                    >
                      <Star size={16} className="fill-white" />
                      <span>Write a Review</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {reviewHistory.length === 0 ? (
            <div className="bg-white border border-[#e8d5c8]/80 rounded-2xl shadow-sm p-8 sm:p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#0a0808]">No Reviews Written Yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
                Your past reviews, photo attachments, and ratings will be recorded here so you can view or update them anytime.
              </p>
              <button
                onClick={() => setActiveTab("pending")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b08a78] text-white text-xs sm:text-sm font-semibold hover:bg-[#976f5d] transition shadow-sm"
              >
                <Star size={16} />
                <span>Review Pending Items ({toBeReviewed.length})</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {reviewHistory.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white border border-[#e8d5c8]/80 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4 hover:border-[#b08a78]/60 transition"
                >
                  {/* Top: Product details & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Link
                        href={rev.product?.slug ? `/products/${rev.product.slug}` : "#"}
                        className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 group"
                      >
                        <Image
                          src={rev.variant?.image || rev.product?.image || "/placeholder.png"}
                          alt={rev.product?.title || "Product"}
                          fill
                          sizes="56px"
                          className="object-contain p-1 group-hover:scale-105 transition-transform"
                        />
                      </Link>

                      <div className="min-w-0">
                        <Link
                          href={rev.product?.slug ? `/products/${rev.product.slug}` : "#"}
                          className="font-semibold text-sm sm:text-base text-[#0a0808] hover:text-[#b08a78] transition line-clamp-1"
                        >
                          {rev.product?.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                          {rev.variant?.colorName && (
                            <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                              Color: {rev.variant.colorName}
                            </span>
                          )}
                          {rev.variant?.sizeName && (
                            <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                              Size: {rev.variant.sizeName}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400">
                            Reviewed on {formatDate(rev.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Edit, View, Delete */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenEdit(rev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
                        title="Edit Review"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>

                      <Link
                        href={rev.product?.slug ? `/products/${rev.product.slug}#reviews` : "#"}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
                        title="View on Product Page"
                      >
                        <ExternalLink size={13} />
                        <span>View</span>
                      </Link>

                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        disabled={deletingId === rev.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Review"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Rating Stars & Badge */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={18}
                          className={
                            s <= rev.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-gray-800">
                      {rev.rating}.0 / 5.0
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <CheckCircle size={10} /> Verified Purchase
                    </span>
                  </div>

                  {/* Review Text */}
                  {rev.comment ? (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  ) : (
                    <p className="text-xs italic text-gray-400">
                      No written feedback provided.
                    </p>
                  )}

                  {/* Attached Photos Gallery */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Customer Photos ({rev.images.length}):
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {rev.images.map((imgUrl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightboxImage(imgUrl)}
                            className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#b08a78] transition shadow-xs"
                          >
                            <Image
                              src={imgUrl}
                              alt={`Customer photo ${i + 1}`}
                              fill
                              sizes="80px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Maximize2 size={16} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attached Video Player */}
                  {rev.video && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Customer Video Review:
                      </span>
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black max-w-sm shadow-xs">
                        <video
                          src={rev.video}
                          controls
                          className="w-full h-44 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Seller Store Response Callout */}
                  {rev.sellerReply && (
                    <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            {rev.sellerReplyShopName || "Store"} Response
                          </span>
                          <span className="text-[10px] bg-[#b08a78] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Official Seller
                          </span>
                        </div>
                        {rev.sellerRepliedAt && (
                          <span className="text-[11px] text-gray-500">
                            {formatDate(rev.sellerRepliedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-1 border-l-2 border-[#b08a78]">
                        {rev.sellerReply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Submission & Edit Modal */}
      {modalOpen && selectedReviewItem && session?.user?.token && (
        <ReviewModal
          isEdit={selectedReviewItem.isEdit}
          reviewId={selectedReviewItem.reviewId}
          productId={selectedReviewItem.productId}
          productTitle={selectedReviewItem.productTitle}
          productImage={selectedReviewItem.productImage}
          variantDetails={selectedReviewItem.variantDetails}
          orderItemId={selectedReviewItem.orderItemId}
          variantId={selectedReviewItem.variantId}
          initialRating={selectedReviewItem.rating}
          initialComment={selectedReviewItem.comment}
          initialImages={selectedReviewItem.images}
          initialVideo={selectedReviewItem.video}
          token={session.user.token}
          onClose={() => {
            setModalOpen(false);
            setSelectedReviewItem(null);
          }}
          onSuccess={async () => {
            await fetchData();
            if (!selectedReviewItem.isEdit) {
              setActiveTab("history");
            }
          }}
        />
      )}

      {/* Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition"
              title="Close image"
            >
              <X size={26} />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={lightboxImage}
                alt="Enlarged review photo"
                fill
                sizes="(max-width: 1024px) 90vw, 800px"
                className="object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
