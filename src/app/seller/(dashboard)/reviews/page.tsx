"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Star,
    Clock,
    User,
    Package,
    X,
    Play,
    Pin,
    MessageSquare,
    Send,
    Edit3,
    Trash2,
    CheckCircle2,
    ExternalLink,
    Maximize2,
    Filter,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { reviewService } from "@/lib/services/seller/reviewService";
import SellerLoader from "@/components/seller/SellerLoader";

interface Review {
    id: number;
    rating: number;
    comment: string;
    image: string;
    images?: string[];
    video: string;
    createdAt: string;
    updatedAt: string;
    isPinned: boolean;
    sellerReply?: string | null;
    sellerRepliedAt?: string | null;
    sellerReplyShopName?: string | null;
    userId: number;
    productId: number;
    product: {
        id: number;
        title: string;
        slug: string;
        primaryImage: string;
    };
    user: {
        id: number;
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
    };
}

export default function ReviewsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStar, setFilterStar] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("recent");

    // Reply Modal State
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [activeReviewForReply, setActiveReviewForReply] = useState<Review | null>(null);
    const [replyText, setReplyText] = useState("");
    const [submittingReply, setSubmittingReply] = useState(false);
    const [replySuccessMsg, setReplySuccessMsg] = useState<string | null>(null);

    // Lightbox Modal State
    const [lightboxMedia, setLightboxMedia] = useState<{ type: "image" | "video"; url: string } | null>(null);

    const loadReviews = async (token: string) => {
        try {
            setLoading(true);
            const res = await reviewService.getReviews(token);
            if (res?.success) {
                setReviews(res.data || []);
            } else if (Array.isArray(res)) {
                setReviews(res);
            } else {
                setReviews([]);
            }
        } catch (err) {
            console.error("Failed to fetch seller reviews:", err);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.replace(ROUTES.SELLER.LOGIN);
        } else if (session?.user?.token) {
            loadReviews(session.user.token);
        }
    }, [status, session, router]);

    // Handle Pin Toggle
    const handleTogglePin = async (id: number, currentPinned: boolean) => {
        if (!session?.user?.token) return;
        try {
            setReviews((prev) => {
                const updated = prev.map((r) => (r.id === id ? { ...r, isPinned: !currentPinned } : r));
                return updated.sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
            });

            await reviewService.togglePin(id, !currentPinned, session.user.token);
        } catch (err) {
            console.error("Failed to toggle pin:", err);
            if (session?.user?.token) {
                loadReviews(session.user.token);
            }
        }
    };

    // Open Reply Modal
    const handleOpenReplyModal = (review: Review) => {
        setActiveReviewForReply(review);
        setReplyText(review.sellerReply || "");
        setReplySuccessMsg(null);
        setReplyModalOpen(true);
    };

    // Submit Reply
    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeReviewForReply || !session?.user?.token) return;

        try {
            setSubmittingReply(true);
            await reviewService.replyReview(activeReviewForReply.id, replyText.trim(), session.user.token);

            // Optimistic update
            setReviews((prev) =>
                prev.map((r) =>
                    r.id === activeReviewForReply.id
                        ? {
                              ...r,
                              sellerReply: replyText.trim() || null,
                              sellerRepliedAt: replyText.trim() ? new Date().toISOString() : null,
                          }
                        : r
                )
            );

            setReplySuccessMsg(replyText.trim() ? "Reply published successfully!" : "Reply removed.");
            setTimeout(() => {
                setReplyModalOpen(false);
                setActiveReviewForReply(null);
                setReplyText("");
                setReplySuccessMsg(null);
            }, 1000);
        } catch (err: any) {
            alert(err?.message || "Failed to submit reply");
        } finally {
            setSubmittingReply(false);
        }
    };

    // Filter & Sort
    const filteredReviews = useMemo(() => {
        let list = [...reviews];

        if (filterStar === "replied") {
            list = list.filter((r) => !!r.sellerReply);
        } else if (filterStar === "unreplied") {
            list = list.filter((r) => !r.sellerReply);
        } else if (filterStar !== "all") {
            const star = parseInt(filterStar);
            list = list.filter((r) => Math.round(r.rating) === star);
        }

        if (sortBy === "highest") {
            list.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === "lowest") {
            list.sort((a, b) => a.rating - b.rating);
        } else {
            // Recent (pinned first)
            list.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }

        return list;
    }, [reviews, filterStar, sortBy]);

    const averageRating =
        reviews.length > 0
            ? (reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
            : "0.0";

    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => Math.round(r.rating) === star).length,
        percentage:
            reviews.length > 0
                ? (reviews.filter((r) => Math.round(r.rating) === star).length / reviews.length) * 100
                : 0,
    }));

    if (loading) {
        return <SellerLoader />;
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
                    <p className="text-sm text-gray-500">
                        View customer feedback, pin top reviews, and reply directly to your buyers
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Store Lifetime</span>
                    </div>
                </div>
            </div>

            {reviews.length > 0 ? (
                <>
                    {/* Summary Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Average Store Rating
                            </h3>
                            <div className="text-6xl font-black text-gray-900 mb-3">{averageRating}</div>
                            <div className="flex items-center text-amber-400 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={22}
                                        className={
                                            i < Math.round(Number(averageRating))
                                                ? "fill-amber-400 text-amber-400"
                                                : "fill-gray-100 text-gray-200"
                                        }
                                    />
                                ))}
                            </div>
                            <p className="text-xs font-semibold text-gray-500">
                                Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                            </p>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
                                Rating Breakdown
                            </h3>
                            <div className="space-y-3.5">
                                {ratingDistribution.map((dist) => (
                                    <div key={dist.star} className="flex items-center gap-4 text-xs font-semibold">
                                        <div className="flex items-center gap-1 w-12 text-gray-700">
                                            <span>{dist.star}</span>
                                            <Star size={13} className="fill-amber-400 text-amber-400" />
                                        </div>
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                                                style={{ width: `${dist.percentage}%` }}
                                            />
                                        </div>
                                        <div className="w-12 text-right text-gray-400">{dist.count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Filter and Reviews Grid */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                                    <Filter size={14} /> Filter:
                                </span>
                                {[
                                    { key: "all", label: `All (${reviews.length})` },
                                    { key: "5", label: "5 Stars" },
                                    { key: "4", label: "4 Stars" },
                                    { key: "3", label: "3 Stars" },
                                    { key: "unreplied", label: "Needs Reply" },
                                    { key: "replied", label: "Replied" },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setFilterStar(tab.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            filterStar === tab.key
                                                ? "bg-gray-900 text-white shadow-xs"
                                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium outline-none shadow-xs"
                                >
                                    <option value="recent">Most Recent</option>
                                    <option value="highest">Highest Rated</option>
                                    <option value="lowest">Lowest Rated</option>
                                </select>
                            </div>
                        </div>

                        {/* Reviews Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredReviews.map((review) => (
                                <ReviewCard
                                    key={review.id}
                                    review={review}
                                    onTogglePin={handleTogglePin}
                                    onOpenReply={handleOpenReplyModal}
                                    onOpenMedia={(type, url) => setLightboxMedia({ type, url })}
                                />
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                /* Empty State */
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 sm:p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-5">
                        <Star size={40} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Reviews Yet</h2>
                    <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
                        When customers purchase and review your products, their ratings, comments, photos, and videos will appear here.
                    </p>
                    <button
                        onClick={() => router.push("/seller/products")}
                        className="bg-[#b08a78] hover:bg-[#976f5d] text-white px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition"
                    >
                        Check My Products
                    </button>
                </div>
            )}

            {/* SELLER REPLY MODAL */}
            {replyModalOpen && activeReviewForReply && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={18} className="text-[#b08a78]" />
                                <h3 className="font-bold text-gray-900 text-base">
                                    {activeReviewForReply.sellerReply ? "Edit Store Reply" : "Reply to Customer Review"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setReplyModalOpen(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Customer Review Snapshot */}
                        <div className="p-6 space-y-4">
                            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-gray-800">
                                        {activeReviewForReply.user?.name || "Customer"}
                                    </span>
                                    <div className="flex items-center text-amber-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={12}
                                                className={
                                                    i < activeReviewForReply.rating
                                                        ? "fill-amber-400 text-amber-400"
                                                        : "fill-gray-200 text-gray-200"
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-3 italic">
                                    "{activeReviewForReply.comment || "No comment text"}"
                                </p>
                            </div>

                            {replySuccessMsg && (
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    <span>{replySuccessMsg}</span>
                                </div>
                            )}

                            {/* Reply Input Form */}
                            <form onSubmit={handleSubmitReply} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Your Store Response
                                    </label>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                                        rows={4}
                                        placeholder="Thank the customer, address their feedback, or explain the product care tips..."
                                        className="w-full border border-gray-200 rounded-xl p-3 text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition resize-none"
                                    />
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                                        <span>Visible publicly under the review on the product page</span>
                                        <span>{replyText.length} / 500</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    {activeReviewForReply.sellerReply ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReplyText("");
                                            }}
                                            className="text-xs text-red-600 hover:underline flex items-center gap-1 font-semibold"
                                        >
                                            <Trash2 size={12} /> Clear Reply
                                        </button>
                                    ) : (
                                        <span />
                                    )}

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setReplyModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submittingReply}
                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#b08a78] hover:bg-[#976f5d] text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                                        >
                                            <Send size={13} />
                                            <span>{submittingReply ? "Saving..." : "Post Response"}</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX MODAL */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setLightboxMedia(null)}
                >
                    <div
                        className="relative max-w-3xl max-h-[85vh] w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setLightboxMedia(null)}
                            className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition"
                            title="Close"
                        >
                            <X size={26} />
                        </button>
                        {lightboxMedia.type === "video" ? (
                            <video
                                src={lightboxMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[80vh] rounded-xl object-contain bg-black"
                            />
                        ) : (
                            <div className="relative w-full h-full">
                                <Image
                                    src={lightboxMedia.url}
                                    alt="Enlarged media"
                                    fill
                                    sizes="(max-width: 1024px) 90vw, 800px"
                                    className="object-contain rounded-xl"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ReviewCard({
    review,
    onTogglePin,
    onOpenReply,
    onOpenMedia,
}: {
    review: Review;
    onTogglePin: (id: number, current: boolean) => void;
    onOpenReply: (review: Review) => void;
    onOpenMedia: (type: "image" | "video", url: string) => void;
}) {
    const customerName =
        review.user?.name ||
        [review.user?.firstName, review.user?.lastName].filter(Boolean).join(" ") ||
        "Customer";
    const initial = customerName.charAt(0).toUpperCase() || "C";

    const mediaImages = Array.isArray(review.images) && review.images.length > 0
        ? review.images
        : review.image
        ? [review.image]
        : [];

    return (
        <div
            className={`bg-white rounded-3xl border ${
                review.isPinned
                    ? "border-amber-300 shadow-md ring-2 ring-amber-100"
                    : "border-gray-100 shadow-sm"
            } overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full relative`}
        >
            {/* Pin Toggle Button */}
            <button
                onClick={() => onTogglePin(review.id, review.isPinned)}
                className={`absolute top-4 right-4 p-2 rounded-xl transition-all z-20 ${
                    review.isPinned
                        ? "bg-amber-500 text-white shadow-sm rotate-12 scale-110"
                        : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-amber-600 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 border border-gray-200"
                }`}
                title={review.isPinned ? "Unpin Review" : "Pin Review to Top"}
            >
                <Pin size={16} fill={review.isPinned ? "currentColor" : "none"} />
            </button>

            <div className="p-6 flex flex-col h-full space-y-4">
                {/* Review Header: User & Rating */}
                <div className="flex items-center justify-between pr-8">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#b08a78] font-black text-base flex items-center justify-center border border-amber-200/60 shadow-xs flex-shrink-0">
                            {initial}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{customerName}</h4>
                                {review.isPinned && (
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        Pinned
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center text-amber-400 mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={13}
                                        className={
                                            i < review.rating
                                                ? "fill-amber-400 text-amber-400"
                                                : "fill-gray-100 text-gray-200"
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-[11px] text-gray-400">
                    Reviewed on {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>

                {/* Comment Text */}
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed flex-1 whitespace-pre-line">
                    "{review.comment || "No written comment"}"
                </p>

                {/* Attached Photos / Video */}
                {(mediaImages.length > 0 || review.video) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {mediaImages.map((imgUrl, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onOpenMedia("image", imgUrl)}
                                className="group/img relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 hover:border-[#b08a78] transition shadow-2xs"
                            >
                                <Image
                                    src={imgUrl}
                                    alt={`Review photo ${idx + 1}`}
                                    fill
                                    sizes="56px"
                                    className="object-cover group-hover/img:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                                    <Maximize2 size={12} />
                                </div>
                            </button>
                        ))}

                        {review.video && (
                            <button
                                type="button"
                                onClick={() => onOpenMedia("video", review.video)}
                                className="relative w-14 h-14 rounded-xl bg-black border border-gray-300 flex items-center justify-center text-white hover:opacity-90 transition shadow-2xs"
                                title="Play Video"
                            >
                                <Play size={16} className="fill-white" />
                            </button>
                        )}
                    </div>
                )}

                {/* Product Snapshot */}
                <div className="flex items-center gap-3 p-2.5 bg-gray-50/80 border border-gray-100 rounded-xl">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                        <Image
                            src={review.product?.primaryImage || "/placeholder.png"}
                            alt={review.product?.title || "Product"}
                            fill
                            sizes="48px"
                            className="object-contain p-0.5"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-xs truncate">
                            {review.product?.title}
                        </h5>
                        {review.product?.slug ? (
                            <Link
                                href={`/products/${review.product.slug}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b08a78] hover:underline mt-0.5"
                            >
                                <ExternalLink size={11} />
                                View Live Product
                            </Link>
                        ) : null}
                    </div>
                </div>

                {/* Seller Store Reply Section */}
                {review.sellerReply ? (
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                <MessageSquare size={13} className="text-amber-700" />
                                Your Store Reply:
                            </span>
                            <button
                                onClick={() => onOpenReply(review)}
                                className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                            >
                                <Edit3 size={11} /> Edit
                            </button>
                        </div>
                        <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-line">
                            {review.sellerReply}
                        </p>
                        {review.sellerRepliedAt && (
                            <span className="text-[10px] text-amber-700/80 block">
                                Replied {new Date(review.sellerRepliedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => onOpenReply(review)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 text-gray-700 text-xs font-bold hover:bg-[#b08a78] hover:text-white transition-all border border-gray-200 shadow-2xs"
                    >
                        <MessageSquare size={14} />
                        Reply to Customer
                    </button>
                )}
            </div>
        </div>
    );
}
