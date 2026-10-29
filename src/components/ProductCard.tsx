"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { Heart, Plus, Star } from "lucide-react";

import "swiper/css";
import "swiper/css/pagination";

import { formatSoldDuration } from "@/lib/utils";
interface ProductCardProps {
  product: any;
  onWishlistToggle?: (id: number, isInWishlist: boolean) => void;
  onCardClick?: () => void;
  viewMode?: "grid" | "list";
  priority?: boolean;
}

export default function ProductCard({
  product,
  onWishlistToggle,
  onCardClick,
  viewMode = "grid",
  priority = false,
}: ProductCardProps) {
  const router = useRouter();
  const [wishlist, setWishlist] = useState(product.isInWishlist);

  const handleCardClick = () => {
    onCardClick?.();
    router.push(`/products/${product.slug}`);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !wishlist;
    setWishlist(newState);
    onWishlistToggle?.(product.id, newState);
  };

  const soldDurationLabel = formatSoldDuration(product.soldHighlightDuration);

  // =========================================================================
  // LIST VIEW LAYOUT
  // =========================================================================
  if (viewMode === "list") {
    return (
      <div
        onClick={handleCardClick}
        className="group flex flex-col sm:flex-row items-stretch w-full bg-white border border-gray-200/80 hover:border-gray-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer p-4 sm:p-5 gap-5 sm:gap-6 min-w-0"
      >
        {/* --- Image Section --- */}
        <div className="relative w-full sm:w-56 shrink-0 aspect-[3/4] overflow-hidden bg-gray-50 rounded-xl">
          {/* Wishlist Button */}
          <button
            onClick={handleWishlistClick}
            aria-label="Wishlist"
            className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm border border-gray-200 hover:border-gray-300 rounded-full p-2 shadow-sm transition hover:scale-105"
          >
            <Heart
              size={18}
              className={
                wishlist
                  ? "fill-red-500 text-red-500"
                  : "text-gray-600 hover:text-red-500 hover:fill-red-500"
              }
            />
          </button>

          {/* Sold Badge */}
          {product.soldCount > 0 && soldDurationLabel && (
            <div className="absolute top-3 left-3 z-20 bg-black/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              Sold {product.soldCount} in {soldDurationLabel}
            </div>
          )}

          {/* Images Swiper */}
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            className="w-full h-full overflow-hidden"
          >
            {(Array.isArray(product.productimage) && product.productimage.length > 0
              ? product.productimage
              : [{ url: "/images/placeholder.png", alt: product.title }]
            ).map((img: any, index: number) => (
              <SwiperSlide key={index}>
                <div className="relative w-full h-full">
                  <Image
                    src={img.url}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 224px"
                    priority={Boolean(priority && index === 0)}
                    loading={priority && index === 0 ? "eager" : "lazy"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e: any) => {
                      if (e.target && e.target.src) {
                        e.target.onerror = null;
                        e.target.srcset = "";
                        e.target.src = "/images/placeholder.png";
                      }
                    }}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* --- Content Section --- */}
        <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
          <div>
            {/* Category if available */}
            {product.category?.name && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1 block">
                {product.category.name}
              </span>
            )}

            {/* Product Title */}
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">
              {product.title}
            </h3>

            {/* Rating Stars */}
            {product.rating > 0 && product.reviewsCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < Math.floor(product.rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200"
                      }
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-800">
                  {product.rating}
                </span>
                <span className="text-xs text-gray-500">
                  ({product.reviewsCount} {product.reviewsCount === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}

            {/* Short Description */}
            {(product.shortDescription || product.description) && (
              <p className="text-xs sm:text-sm text-gray-500 mt-2.5 line-clamp-2 leading-relaxed">
                {(product.shortDescription || product.description).replace(/<[^>]*>?/gm, "")}
              </p>
            )}

            {/* Color Swatches */}
            {product.productvariant?.length > 0 && (
              <div className="flex items-center gap-2 mt-3.5">
                <span className="text-xs text-gray-400 font-medium">Colours:</span>
                <div className="flex items-center gap-1.5">
                  {product.productvariant.slice(0, 5).map((variant: any, idx: number) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                      style={{ backgroundColor: variant.color?.hexCode }}
                    />
                  ))}
                  {product.productvariant.length > 5 && (
                    <span className="text-[10px] text-gray-500 font-medium ml-0.5">
                      +{product.productvariant.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Price + Action Button */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              {product.discountPrice &&
              Number(product.discountPrice) <
                Number(product.sellingPrice || product.price) ? (
                <>
                  <span className="text-lg sm:text-xl font-bold text-[var(--brand-primary)]">
                    £{Number(product.discountPrice).toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-400 line-through">
                    £{Number(product.sellingPrice || product.price || 0).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-lg sm:text-xl font-bold text-[var(--brand-primary)]">
                  £{Number(product.sellingPrice || product.price || 0).toFixed(2)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition shadow-sm"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GRID VIEW LAYOUT (DEFAULT)
  // =========================================================================

  return (
    // <div
    //   onClick={handleCardClick}
    //   // className="group flex flex-col w-full max-w-full sm:max-w-[280px] cursor-pointer"
    //  className="group flex flex-col w-full cursor-pointer"


    // >

    <div
      onClick={handleCardClick}
      className="group flex flex-col items-center w-full cursor-pointer min-w-0"
    >



      {/* --- Image Section --- */}
      {/* <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300"> */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 z-20 bg-white border border-gray-200 hover:border-gray-300 rounded-full p-2 shadow-sm transition"
        >
          <Heart
            size={18}
            className={wishlist
              ? "fill-red-500 text-red-500"
              : "text-gray-600 hover:text-red-500 hover:fill-red-500"}
          />
        </button>

        {/* Sold Badge - FIXED */}
        {product.soldCount > 0 && soldDurationLabel && (
          <div className="absolute top-3 left-3 z-20 bg-black/80 text-white text-[10px] px-3 py-1 rounded-full shadow-sm">
            Sold {product.soldCount} in {soldDurationLabel}
          </div>
        )}

        {/* Images */}
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          className="w-full h-full overflow-hidden"
        >
          {(Array.isArray(product.productimage) && product.productimage.length > 0
            ? product.productimage
            : [{ url: "/images/placeholder.png", alt: product.title }]
          ).map((img: any, index: number) => (
            <SwiperSlide key={index}>
              <div className="relative w-full h-full">
                <Image
                  src={img.url}
                  alt={product.title}
                  fill
                  sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  priority={Boolean(priority && index === 0)}
                  loading={priority && index === 0 ? "eager" : "lazy"}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e: any) => {
                    // Fallback to placeholder on broken asset
                    if (e.target && e.target.src) {
                      e.target.onerror = null;
                      e.target.srcset = "";
                      e.target.src = "/images/placeholder.png";
                    }
                  }}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* --- Content Section --- */}
      <div className="pt-3 pb-3 text-center">
        {/* Product Title */}
        <h3 className="text-[15px] md:text-[16px] font-semibold text-gray-900 line-clamp-2">
          {product.title}
        </h3>

        {/* PRICE + RATING — Tight & Clean */}
        <div className="mt-2 flex items-center justify-center gap-3">
          {/* Price with .toFixed(2) */}
          <div className="flex items-center gap-2">
            {product.discountPrice && Number(product.discountPrice) < Number(product.sellingPrice || product.price) ? (
              <>
                <p className="text-[var(--brand-primary)] font-semibold text-[15px]">
                  £{Number(product.discountPrice).toFixed(2)}
                </p>
                <p className="text-gray-400 line-through text-[13px]">
                  £{Number(product.sellingPrice || product.price || 0).toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-[var(--brand-primary)] font-semibold text-[15px]">
                £{Number(product.sellingPrice || product.price || 0).toFixed(2)}
              </p>
            )}
          </div>

          {/* Rating — show only if rating > 0 */}
          {product.rating > 0 && product.reviewsCount > 0 && (
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-gray-800">{product.rating}</span>
              <span className="text-xs text-gray-500">({product.reviewsCount})</span>
            </div>
          )}

        </div>



        {/* Color Dots */}
        {product.productvariant?.length > 0 && (
          <div className="flex justify-center gap-2 mt-3">
            {product.productvariant.slice(0, 3).map((variant: any, idx: number) => (
              <span
                key={idx}
                className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                style={{ backgroundColor: variant.color?.hexCode }}
              />
            ))}

            {product.productvariant.length > 3 && (
              <div className="w-4 h-4 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[10px] text-gray-600">
                <Plus size={10} />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
